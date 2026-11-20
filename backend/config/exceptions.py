from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        data = {'errors': response.data}
        if isinstance(response.data, dict) and 'detail' in response.data:
            data = {'error': str(response.data['detail'])}
        response.data = data

    return response
