from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Brand, Collection, Watch, WatchImage, Favorite

User = get_user_model()


class BrandModelTest(TestCase):
    def test_create_brand(self):
        brand = Brand.objects.create(name='Rolex', slug='rolex', country='Suiza')
        self.assertEqual(str(brand), 'Rolex')
        self.assertTrue(brand.is_active)

    def test_brand_unique_name(self):
        Brand.objects.create(name='Omega', slug='omega')
        with self.assertRaises(Exception):
            Brand.objects.create(name='Omega', slug='omega-2')


class CollectionModelTest(TestCase):
    def test_create_collection(self):
        col = Collection.objects.create(name='Clásica', slug='clasica')
        self.assertEqual(str(col), 'Clásica')


class WatchModelTest(TestCase):
    def setUp(self):
        self.brand = Brand.objects.create(name='Rolex', slug='rolex')
        self.collection = Collection.objects.create(name='Deportiva', slug='deportiva')

    def test_create_watch(self):
        watch = Watch.objects.create(
            name='Submariner', slug='submariner', reference='REF-001',
            brand=self.brand, collection=self.collection,
            description='Dive watch', price=Decimal('12000.00'), stock=5
        )
        self.assertEqual(str(watch), 'Rolex Submariner')
        self.assertTrue(watch.is_available)

    def test_watch_out_of_stock(self):
        watch = Watch.objects.create(
            name='Daytona', slug='daytona', reference='REF-002',
            brand=self.brand, description='Race watch',
            price=Decimal('35000.00'), stock=0
        )
        self.assertFalse(watch.is_available)

    def test_watch_inactive(self):
        watch = Watch.objects.create(
            name='Explorer', slug='explorer', reference='REF-003',
            brand=self.brand, description='Adventure watch',
            price=Decimal('8000.00'), stock=3, is_active=False
        )
        self.assertFalse(watch.is_available)


class WatchImageModelTest(TestCase):
    def setUp(self):
        brand = Brand.objects.create(name='Omega', slug='omega')
        self.watch = Watch.objects.create(
            name='Speedmaster', slug='speedmaster', reference='REF-SPD',
            brand=brand, description='Moon watch', price=Decimal('6000.00'), stock=2
        )

    def test_primary_image_uniqueness(self):
        img1 = WatchImage.objects.create(watch=self.watch, image='a.jpg', is_primary=True)
        img2 = WatchImage.objects.create(watch=self.watch, image='b.jpg', is_primary=True)
        img1.refresh_from_db()
        self.assertFalse(img1.is_primary)
        self.assertTrue(img2.is_primary)


class FavoriteModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='favuser', email='fav@test.com', password='Pass123!'
        )
        brand = Brand.objects.create(name='Cartier', slug='cartier')
        self.watch = Watch.objects.create(
            name='Tank', slug='tank', reference='REF-TANK',
            brand=brand, description='Classic', price=Decimal('5000.00'), stock=1
        )

    def test_create_favorite(self):
        fav = Favorite.objects.create(user=self.user, watch=self.watch)
        self.assertIn(self.user.email, str(fav))

    def test_favorite_unique_together(self):
        Favorite.objects.create(user=self.user, watch=self.watch)
        with self.assertRaises(Exception):
            Favorite.objects.create(user=self.user, watch=self.watch)


class BrandViewSetTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        Brand.objects.create(name='Rolex', slug='rolex', country='Suiza', is_active=True)
        Brand.objects.create(name='Omega', slug='omega', country='Suiza', is_active=True)

    def test_list_brands(self):
        resp = self.client.get('/api/catalog/brands/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data.get('results', resp.data) if isinstance(resp.data, dict) else resp.data
        self.assertEqual(len(results), 2)

    def test_retrieve_brand(self):
        brand = Brand.objects.get(slug='rolex')
        resp = self.client.get(f'/api/catalog/brands/{brand.pk}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['name'], 'Rolex')


class PreviewImagesTest(TestCase):
    """Marcas y colecciones traen imágenes de muestra para la portada (sin consultas extra)."""

    def setUp(self):
        self.client = APIClient()
        self.brand = Brand.objects.create(name='Rolex', slug='rolex', is_active=True)
        self.collection = Collection.objects.create(name='Deportiva', slug='deportiva', is_active=True)
        for i in range(5):
            watch = Watch.objects.create(
                name=f'Pieza {i}', slug=f'pieza-{i}', reference=f'REF-{i}', brand=self.brand,
                collection=self.collection, description='-', price=Decimal(1000 + i), stock=1,
                is_featured=(i == 0),
            )
            WatchImage.objects.create(watch=watch, image=f'watches/pieza-{i}-side.webp', order=1)
            WatchImage.objects.create(watch=watch, image=f'watches/pieza-{i}-hero.webp', is_primary=True, order=0)
        hidden = Watch.objects.create(
            name='Oculta', slug='oculta', reference='REF-X', brand=self.brand, collection=self.collection,
            description='-', price=Decimal('99999'), stock=1, is_featured=True, is_active=False,
        )
        WatchImage.objects.create(watch=hidden, image='watches/oculta-hero.webp', is_primary=True)

    def test_brand_preview_is_primary_image_of_featured_piece(self):
        resp = self.client.get('/api/catalog/brands/')
        brand = resp.data[0] if isinstance(resp.data, list) else resp.data['results'][0]
        self.assertTrue(brand['preview_image'].endswith('/media/watches/pieza-0-hero.webp'))

    def test_collection_previews_skip_inactive_and_stop_at_three(self):
        resp = self.client.get('/api/catalog/collections/')
        collection = resp.data[0] if isinstance(resp.data, list) else resp.data['results'][0]
        previews = collection['preview_images']
        self.assertEqual(len(previews), 3)
        self.assertFalse(any('oculta' in url for url in previews))
        self.assertTrue(all(url.endswith('-hero.webp') for url in previews))

    def test_brand_without_images_has_no_preview(self):
        Brand.objects.create(name='Nueva', slug='nueva', is_active=True)
        resp = self.client.get('/api/catalog/brands/')
        rows = resp.data if isinstance(resp.data, list) else resp.data['results']
        self.assertIsNone(next(b for b in rows if b['slug'] == 'nueva')['preview_image'])


class WatchViewSetTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.brand = Brand.objects.create(name='Patek Philippe', slug='patek-philippe')
        self.collection = Collection.objects.create(name='Lujo', slug='lujo')
        self.watch = Watch.objects.create(
            name='Nautilus', slug='nautilus', reference='REF-NAUT',
            brand=self.brand, collection=self.collection,
            description='Luxury sports', price=Decimal('35000.00'),
            stock=3, is_featured=True, is_active=True
        )

    def test_list_watches(self):
        resp = self.client.get('/api/catalog/watches/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 1)

    def test_retrieve_watch_by_slug(self):
        resp = self.client.get('/api/catalog/watches/nautilus/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['name'], 'Nautilus')

    def test_featured_watches(self):
        resp = self.client.get('/api/catalog/watches/featured/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_filter_by_brand(self):
        resp = self.client.get(f'/api/catalog/watches/?brand={self.brand.pk}')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 1)

    def test_filter_by_price_range(self):
        resp = self.client.get('/api/catalog/watches/?price_min=30000&price_max=40000')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 1)


class FavoriteViewSetTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='favviewuser', email='fv@test.com', password='Pass123!'
        )
        self.client.force_authenticate(user=self.user)
        brand = Brand.objects.create(name='TAG Heuer', slug='tag-heuer')
        self.watch = Watch.objects.create(
            name='Carrera', slug='carrera', reference='REF-CAR',
            brand=brand, description='Racing', price=Decimal('4500.00'), stock=2
        )

    def test_add_favorite(self):
        resp = self.client.post('/api/catalog/favorites/', {'watch_id': self.watch.pk}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_list_favorites(self):
        Favorite.objects.create(user=self.user, watch=self.watch)
        resp = self.client.get('/api/catalog/favorites/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_favorites_require_auth(self):
        client = APIClient()
        resp = client.get('/api/catalog/favorites/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class AdminWatchViewSetTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='admin', email='admin@test.com', password='Admin123!'
        )
        self.client.force_authenticate(user=self.admin)
        self.brand = Brand.objects.create(name='Rolex', slug='rolex')

    def test_admin_create_watch(self):
        resp = self.client.post('/api/catalog/admin/watches/', {
            'name': 'GMT-Master', 'slug': 'gmt-master', 'reference': 'REF-GMT',
            'brand': self.brand.pk, 'description': 'Travel watch',
            'price': '15000.00', 'stock': 5
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_admin_update_watch(self):
        watch = Watch.objects.create(
            name='Sea-Dweller', slug='sea-dweller', reference='REF-SD',
            brand=self.brand, description='Deep dive', price=Decimal('14000.00'), stock=2
        )
        resp = self.client.patch(
            f'/api/catalog/admin/watches/{watch.pk}/',
            {'price': '15000.00'}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        watch.refresh_from_db()
        self.assertEqual(watch.price, Decimal('15000.00'))

    def test_non_admin_denied(self):
        user = User.objects.create_user(
            username='regular', email='reg@test.com', password='Pass123!'
        )
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get('/api/catalog/admin/watches/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
