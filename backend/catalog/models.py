from django.db import models
from django.conf import settings


class Brand(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to='brands/', blank=True, null=True)
    country = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Collection(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='collections/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Watch(models.Model):
    MOVEMENT_CHOICES = [
        ('automatic', 'Automático'),
        ('manual', 'Cuerda manual'),
        ('quartz', 'Cuarzo'),
        ('solar', 'Solar'),
        ('spring_drive', 'Spring Drive'),
    ]

    CRYSTAL_CHOICES = [
        ('sapphire', 'Cristal de zafiro'),
        ('mineral', 'Cristal mineral'),
        ('acrylic', 'Acrílico'),
    ]

    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    reference = models.CharField(max_length=50, unique=True)
    brand = models.ForeignKey(Brand, on_delete=models.PROTECT, related_name='watches')
    collection = models.ForeignKey(Collection, on_delete=models.SET_NULL, null=True, blank=True, related_name='watches')
    description = models.TextField()
    price = models.DecimalField(max_digits=12, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    movement = models.CharField(max_length=20, choices=MOVEMENT_CHOICES, default='automatic')
    case_material = models.CharField(max_length=100, default='Acero inoxidable')
    case_diameter = models.CharField(max_length=20, default='40mm')
    water_resistance = models.CharField(max_length=50, default='100m')
    crystal = models.CharField(max_length=20, choices=CRYSTAL_CHOICES, default='sapphire')
    strap_material = models.CharField(max_length=100, default='Acero inoxidable')
    warranty = models.CharField(max_length=50, default='2 años')
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'watches'
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['brand', 'is_active']),
            models.Index(fields=['price']),
        ]

    def __str__(self):
        return f"{self.brand.name} {self.name}"

    @property
    def is_available(self):
        return self.is_active and self.stock > 0


class WatchImage(models.Model):
    watch = models.ForeignKey(Watch, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='watches/')
    alt_text = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Image for {self.watch.name}"

    def save(self, *args, **kwargs):
        if self.is_primary:
            WatchImage.objects.filter(watch=self.watch, is_primary=True).exclude(pk=self.pk).update(is_primary=False)
        super().save(*args, **kwargs)


class Favorite(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='favorites')
    watch = models.ForeignKey(Watch, on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'watch')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} → {self.watch.name}"
