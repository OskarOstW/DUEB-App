import json

from django.utils.html import format_html, format_html_join


def display_value(value):
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except (ValueError, TypeError):
            pass
    if isinstance(value, dict):
        rows = format_html_join(
            "",
            '<tr><th style="text-align:left;vertical-align:top">{}</th><td>{}</td></tr>',
            ((str(key), display_value(item)) for key, item in value.items()),
        )
        return format_html('<table style="width:100%">{}</table>', rows)
    if isinstance(value, list):
        return format_html(
            "<ol>{}</ol>",
            format_html_join(
                "", "<li>{}</li>", ((display_value(item),) for item in value)
            ),
        )
    return format_html(
        '<span style="white-space:pre-wrap;overflow-wrap:anywhere">{}</span>',
        "-" if value is None else value,
    )
