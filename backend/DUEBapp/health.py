from django.db import DatabaseError, connection
from django.http import JsonResponse


def ready(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except DatabaseError:
        return JsonResponse({"ready": False}, status=503)
    return JsonResponse({"ready": True})
