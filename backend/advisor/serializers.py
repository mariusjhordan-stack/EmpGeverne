from rest_framework import serializers

from .currency import CURRENCIES

MAX_MESSAGES = 20
MAX_CONTENT = 1000


class MessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=['user', 'assistant'])
    content = serializers.CharField(max_length=MAX_CONTENT)

    def to_internal_value(self, data):
        # Tolerate the Java client's shape: {"role": "model", "text": "..."}.
        if isinstance(data, dict):
            data = dict(data)
            if 'content' not in data and 'text' in data:
                data['content'] = data.pop('text')
            if data.get('role') == 'model':
                data['role'] = 'assistant'
        return super().to_internal_value(data)


class ChatRequestSerializer(serializers.Serializer):
    messages = MessageSerializer(many=True, allow_empty=False, max_length=MAX_MESSAGES)
    currency = serializers.CharField(max_length=3, required=False, default='PEN')
    language = serializers.CharField(max_length=10, required=False, default='es')

    def validate_currency(self, value):
        code = (value or 'PEN').strip().upper()
        if code not in CURRENCIES:
            raise serializers.ValidationError('Moneda no soportada. Usa PEN, USD o EUR.')
        return code

    def validate_language(self, value):
        return (value or 'es').strip().lower().split('-')[0] or 'es'

    def validate_messages(self, value):
        if value[-1]['role'] != 'user':
            raise serializers.ValidationError('El último mensaje debe ser del cliente (role "user").')
        return value
