import base64
import binascii
import hashlib
import io
import json
import uuid
import warnings

from django.core.files.base import ContentFile
from django.db import transaction
from PIL import Image, UnidentifiedImageError
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError

from ..catalog_versions import assignment_definition, fingerprint, form_definition
from ..models import (
    Form,
    FormResponse,
    FormResponseImage,
    ObserverAccount,
    SubmissionReceipt,
    TestScenario,
    TestScenarioVictim,
    VictimProfileResponse,
)


class Conflict(APIException):
    status_code = 409
    default_detail = "Der Serverstand wurde geändert. Lokale Daten bleiben erhalten. Bitte den Konflikt vor erneutem Senden klären."


def structured(value, kind, field):
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except (ValueError, TypeError):
            raise ValidationError({field: "Ungültiges JSON."})
    if not isinstance(value, kind):
        raise ValidationError({field: "Ungültige Datenstruktur."})
    return value


def decode_images(value):
    image_map = structured(value, dict, "images")
    decoded = []
    for question_id, entries in image_map.items():
        if not isinstance(entries, list):
            raise ValidationError({"images": "Eine Bilderliste wird erwartet."})
        for entry in entries:
            if len(decoded) >= 15 or not isinstance(entry, dict):
                raise ValidationError({"images": "Maximal 15 gültige Bilder je Formular."})
            uri = entry.get("uri", "")
            if (
                not isinstance(uri, str)
                or not uri.startswith("data:image/")
                or ";base64," not in uri
                or len(uri) > 3 * 1024 * 1024
            ):
                raise ValidationError({"images": "Ungültiges oder zu großes Bild."})
            try:
                raw = base64.b64decode(uri.split(",", 1)[1], validate=True)
                if len(raw) > 2 * 1024 * 1024:
                    raise ValueError()
                with warnings.catch_warnings():
                    warnings.simplefilter("error", Image.DecompressionBombWarning)
                    with Image.open(io.BytesIO(raw)) as image:
                        if (
                            image.format not in {"JPEG", "PNG", "WEBP"}
                            or image.width * image.height > 20_000_000
                        ):
                            raise ValueError()
                        image.load()
                        output = io.BytesIO()
                        image.convert("RGB").save(output, format="JPEG", quality=90)
                name = str(entry.get("name", ""))[:150]
                decoded.append(
                    (
                        ContentFile(output.getvalue(), name=f"{uuid.uuid4().hex}.jpg"),
                        {"questionId": str(question_id), "name": name},
                    )
                )
            except (
                ValueError,
                OSError,
                binascii.Error,
                UnidentifiedImageError,
                Image.DecompressionBombError,
                Image.DecompressionBombWarning,
            ):
                raise ValidationError(
                    {"images": "Das Bild ist beschädigt oder überschreitet die erlaubte Größe."}
                )
    return decoded


def save_submission(account, payload):
    payload = structured(payload, dict, "payload")
    try:
        request_id = uuid.UUID(str(payload["requestId"]))
        revision = payload["expectedRevision"]
        if not isinstance(revision, int) or isinstance(revision, bool) or revision < 0:
            raise ValueError()
    except (KeyError, ValueError, TypeError):
        raise ValidationError({"detail": "requestId und expectedRevision sind erforderlich."})
    digest = hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    forms = structured(payload.get("formResponses", []), list, "formResponses")
    profiles = structured(payload.get("victimProfiles", []), list, "victimProfiles")
    if len(forms) > 200 or len(profiles) > 1000:
        raise ValidationError("Zu viele Einträge in einer Übertragung.")
    written_files = []
    try:
        with transaction.atomic():
            account = ObserverAccount.objects.select_for_update().get(pk=account.pk)
            receipt = SubmissionReceipt.objects.filter(
                observer=account, request_id=request_id
            ).first()
            if receipt:
                if receipt.digest != digest:
                    raise Conflict("Die Übertragungskennung wurde für andere Daten verwendet.")
                return receipt.result
            if revision != account.data_revision:
                raise Conflict()
            scenario = TestScenario.objects.select_for_update().first()
            if not scenario:
                raise ValidationError("Es ist keine Übung eingerichtet.")
            if payload.get("accountId") != str(account.public_id):
                raise ValidationError(
                    "Die Daten gehören nicht zu diesem Konto. Bitte lokal exportieren."
                )
            allowed = set(account.allowed_forms.values_list("id", flat=True))
            prepared = []
            seen = set()
            for item in forms:
                item = structured(item, dict, "formResponses")
                form_id = item.get("formId")
                if not isinstance(form_id, int) or isinstance(form_id, bool):
                    raise ValidationError({"formId": "Eine numerische Formular-ID wird erwartet."})
                if form_id not in allowed:
                    raise PermissionDenied("Das Formular ist für dieses Konto nicht freigegeben.")
                if form_id in seen:
                    raise ValidationError("Ein Formular wurde mehrfach übertragen.")
                seen.add(form_id)
                form = Form.objects.prefetch_related("questions__options").get(pk=form_id)
                definition = form_definition(form)
                version = fingerprint(definition)
                if (
                    item.get("scenarioId") != str(scenario.public_id)
                    or item.get("templateVersion") != version
                ):
                    raise ValidationError(
                        "Übung oder Formularvorlage wurde geändert. Die alten Entwürfe bleiben erhalten und können lokal exportiert werden."
                    )
                values = {
                    target: structured(item.get(source, default), kind, source)
                    for source, target, kind, default in [
                        ("responses", "responses", dict, {}),
                        ("pickerSelections", "picker_selections", dict, {}),
                        ("scaleValues", "scale_values", dict, {}),
                        ("timestamps", "timestamps", dict, {}),
                        ("noteTimestamps", "note_timestamps", list, []),
                    ]
                }
                note = item.get("note", "")
                if not isinstance(note, str) or len(note) > 100000:
                    raise ValidationError("Ungültige Notiz.")
                values["note"] = note
                values.update(
                    scenario_uuid=scenario.public_id,
                    template_version=version,
                    template_snapshot=definition,
                )
                images = decode_images(item.get("images", {}))
                question_ids = set(
                    str(pk)
                    for pk in [
                        q.pk
                        for q in form.questions.all()
                        if q.option_type == "image" or q.image_upload_desired
                    ]
                )
                if any(metadata["questionId"] not in question_ids for _, metadata in images):
                    raise ValidationError("Ein Bild gehört nicht zu diesem Formular.")
                prepared.append((form_id, values, images))
            if profiles and not account.show_patient_profiles:
                raise PermissionDenied("Patientenprofile sind für dieses Konto nicht freigegeben.")
            prepared_profiles = []
            seen = set()
            for item in profiles:
                item = structured(item, dict, "victimProfiles")
                button = item.get("buttonNumber")
                if (
                    not isinstance(button, str)
                    or button in seen
                    or not TestScenarioVictim.objects.filter(
                        scenario=scenario, button_number=button
                    ).exists()
                ):
                    raise ValidationError("Ungültiges oder mehrfach übertragenes Patientenprofil.")
                seen.add(button)
                assignment = TestScenarioVictim.objects.select_related(
                    "scenario", "victim_profile", "organization"
                ).get(scenario=scenario, button_number=button)
                previous = VictimProfileResponse.objects.filter(
                    observer=account, test_scenario=scenario, button_number=button
                ).first()
                if previous and previous.template_snapshot.get("id") not in (None, assignment.pk):
                    raise ValidationError(
                        "Dieser Button wurde bereits für eine andere Patientenzuordnung beantwortet. Bitte eine neue Übung anlegen."
                    )
                definition = assignment_definition(assignment)
                version = fingerprint(definition)
                if (
                    item.get("scenarioId") != str(scenario.public_id)
                    or item.get("assignmentId") != assignment.pk
                    or item.get("profileId") != assignment.victim_profile_id
                    or item.get("templateVersion") != version
                ):
                    raise ValidationError(
                        "Übung oder Patientenzuordnung wurde geändert. Bitte alte Entwürfe lokal exportieren."
                    )
                values = {
                    "scenario_uuid": scenario.public_id,
                    "template_version": version,
                    "template_snapshot": definition,
                }
                for source, target, kind, default in [
                    ("khIntern", "kh_intern", str, ""),
                    ("sollSichtung", "soll_sichtung", str, ""),
                    ("istSichtung", "ist_sichtung", str, ""),
                    ("diagnosticLoaded", "diagnostic_loaded", dict, {}),
                    ("vitalwerte", "vitalwerte", dict, {}),
                    ("sichtungData", "sichtung_data", list, []),
                    ("diagnostikData", "diagnostik_data", list, []),
                    ("therapieData", "therapie_data", list, []),
                    ("opTeam", "op_team", list, []),
                    ("verlaufseintraege", "verlauf", list, []),
                ]:
                    value = item.get(source, default)
                    if (
                        not isinstance(value, kind)
                        or (kind is str and len(value) > (50 if source == "khIntern" else 100))
                        or (
                            kind is list
                            and (
                                len(value) > 1000 or any(not isinstance(row, dict) for row in value)
                            )
                        )
                    ):
                        raise ValidationError({source: "Ungültiger Wert."})
                    values[target] = value
                prepared_profiles.append((button, values))
            identity = {
                "observer": account,
                "observer_email": account.email,
                "observer_name": f"{account.first_name} {account.last_name}".strip(),
                "test_scenario": scenario,
            }
            for form_id, values, images in prepared:
                obj = FormResponse.objects.filter(
                    observer=account, form_id=form_id, test_scenario=scenario
                ).first()
                if obj is None:
                    obj = FormResponse(form_id=form_id)
                for key, value in {**identity, **values}.items():
                    setattr(obj, key, value)
                obj.save()
                old_files = [(image.image.storage, image.image.name) for image in obj.images.all()]
                obj.images.all().delete()
                for index, (file, info) in enumerate(images, start=1):
                    image = FormResponseImage(
                        response=obj,
                        question_id=int(info["questionId"]),
                        question_key=info["questionId"],
                        name=info["name"],
                        position=index,
                    )
                    image.image.save(file.name, file, save=False)
                    written_files.append((image.image.storage, image.image.name))
                    image.save()
                # Only remove replaced files after the database transaction has committed.
                transaction.on_commit(lambda files=old_files: remove_files(files), robust=True)
            for button, values in prepared_profiles:
                VictimProfileResponse.objects.update_or_create(
                    observer=account,
                    button_number=button,
                    test_scenario=scenario,
                    defaults={**identity, **values},
                )
            account.data_revision += 1
            account.save(update_fields=["data_revision"])
            result = {
                "forms_count": len(forms),
                "profiles_count": len(profiles),
                "data_revision": account.data_revision,
                "message": "Alle Daten wurden gespeichert.",
            }
            SubmissionReceipt.objects.create(
                observer=account, request_id=request_id, digest=digest, result=result
            )
            return result
    except Exception:
        for storage, name in written_files:
            storage.delete(name)
        raise


def remove_files(files):
    for storage, name in files:
        storage.delete(name)
