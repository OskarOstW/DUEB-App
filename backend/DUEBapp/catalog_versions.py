"""Content fingerprints bind offline answers to the catalog they were based on."""

import hashlib
import json

from django.forms.models import model_to_dict


def fingerprint(value):
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":"), default=str).encode()
    ).hexdigest()


def form_definition(form):
    data = model_to_dict(form)
    data["questions"] = [
        {
            **model_to_dict(question),
            "options": [
                model_to_dict(option)
                for option in sorted(question.options.all(), key=lambda item: item.pk)
            ],
        }
        for question in sorted(form.questions.all(), key=lambda item: item.pk)
    ]
    return data


def assignment_definition(assignment):
    return {
        "id": assignment.pk,
        "scenarioId": str(assignment.scenario.public_id),
        "buttonNumber": assignment.button_number,
        "profileId": assignment.victim_profile_id,
        "profile": model_to_dict(assignment.victim_profile),
        "organization": model_to_dict(assignment.organization) if assignment.organization else None,
    }
