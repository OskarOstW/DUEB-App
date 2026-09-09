import datetime
from io import BytesIO
from uuid import uuid4

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils import timezone
from PIL import Image, ImageDraw, ImageFont


def generate_overview_image(entries, scenario_name, date_str):
    """Rendert die Verletztenübersicht eines Szenarios als PNG und legt sie im Medienspeicher ab."""
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
    except (OSError, ValueError):
        font = ImageFont.load_default()

    columns = [
        "Button-Nr.",
        "Profil-Nr",
        "Kategorie",
        "Diagnose",
        "Blickdiagnose",
        "PCZ",
    ]
    col_widths = [120, 100, 200, 300, 300, 200]
    row_height = 40
    header_height = 60

    img_width = sum(col_widths) + 80  # Zusätzlicher Platz für Ränder
    img_height = (
        header_height + row_height * (len(entries) + 1) + 50
    )  # +1 für Überschriftenzeile, +50 für Fußzeile

    img = Image.new("RGB", (img_width, img_height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    def sort_key(entry):
        cat = entry.get("category", "").strip()
        btn = entry.get("button_number", "")

        cat_priority = {
            "SK 1/SK 4": 0,
            "SK 4": 0,
            "SK 1": 1,
            "SK 1 (akute vitale Bedrohung)": 1,
            "SK 2": 2,
            "SK 2 (schwer verletzt)": 2,
            "SK 3": 3,
            "SK 3 (leicht verletzt)": 3,
        }

        try:
            clean_btn = "".join(c for c in btn if c.isdigit() or (c == "K" and btn.endswith("K")))
            if clean_btn.endswith("K"):
                base_num = int(clean_btn[:-1])
                btn_num = base_num + 0.5
            else:
                btn_num = int(clean_btn)
        except (TypeError, ValueError):
            btn_num = 999

        return (cat_priority.get(cat, 5), btn_num)

    entries = sorted(entries, key=sort_key)

    draw.text((20, 10), scenario_name, fill=(0, 0, 0), font=font)

    if isinstance(date_str, datetime.date):
        formatted_date = date_str.strftime("%d.%m.%Y")
    else:
        formatted_date = date_str

    date_text = f"Datum der Übung: {formatted_date}"
    date_width = draw.textlength(date_text, font=font)
    draw.text((img_width - date_width - 20, 10), date_text, fill=(0, 0, 0), font=font)

    x_offset = 20
    y_offset = header_height
    for i, col_name in enumerate(columns):
        draw.text((x_offset, y_offset), col_name, fill=(0, 0, 0), font=font)
        x_offset += col_widths[i]

    line_y = y_offset + row_height - 5
    draw.line((20, line_y, img_width - 20, line_y), fill=(0, 0, 0), width=2)

    y_offset += row_height
    for entry in entries:
        cat = entry.get("category", "").strip()

        if cat in ["SK 1/SK 4", "SK 4"]:
            bg_color = (180, 0, 0)  # Dunkelrot
        elif cat.startswith("SK 1"):
            bg_color = (255, 150, 150)  # Helleres Rot
        elif "SK 2" in cat:
            bg_color = (255, 255, 150)  # Kräftiges Gelb
        elif "SK 3" in cat:
            bg_color = (150, 255, 150)  # Kräftiges Grün
        else:
            bg_color = (230, 230, 230)  # Standard-Grau

        draw.rectangle(
            (20, y_offset, img_width - 20, y_offset + row_height),
            fill=bg_color,
            outline=(0, 0, 0),
            width=1,
        )

        row_data = [
            entry.get("button_number", ""),
            entry.get("profile_number", ""),
            cat,
            entry.get("diagnosis", ""),
            entry.get("visual", ""),
            entry.get("pcz", ""),
        ]

        x_off = 20
        for i, cell_text in enumerate(row_data):
            text = str(cell_text)

            available_width = col_widths[i] - 10

            words = text.split()
            lines = []
            current_line = []
            current_width = 0

            for word in words:
                word_width = draw.textlength(word + " ", font=font)
                if current_width + word_width <= available_width:
                    current_line.append(word)
                    current_width += word_width
                else:
                    if current_line:
                        lines.append(" ".join(current_line))
                    current_line = [word]
                    current_width = word_width

            if current_line:
                lines.append(" ".join(current_line))

            for idx, line in enumerate(lines):
                y_pos = y_offset + 5 + (idx * 15)
                if y_pos + 15 <= y_offset + row_height:
                    draw.text((x_off + 5, y_pos), line, fill=(0, 0, 0), font=font)

            if i < len(col_widths) - 1:
                x_line = x_off + col_widths[i]
                draw.line(
                    (x_line, y_offset, x_line, y_offset + row_height),
                    fill=(0, 0, 0),
                    width=1,
                )

            x_off += col_widths[i]

        y_offset += row_height

    draw.text(
        (20, img_height - 30),
        f"Erstellt am {timezone.now():%d.%m.%Y %H:%M}",
        fill=(128, 128, 128),
        font=font,
    )

    output = BytesIO()
    img.save(output, format="PNG")
    return default_storage.save(
        f"homescreen/uebersicht_{uuid4().hex}.png", ContentFile(output.getvalue())
    )
