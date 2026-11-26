// Convierte un reloj de la API de Django al formato que usa el modelo 3D (el mismo del proyecto Java).
const DIAL = {
  negro: 'black', azul: 'blue', blanco: 'white', plata: 'silver', plateado: 'silver', verde: 'green', gris: 'grey',
  marrón: 'brown', marron: 'brown', chocolate: 'brown', crema: 'cream', rojo: 'red', turquesa: 'turquoise', salmón: 'salmon',
  salmon: 'salmon', naranja: 'orange', violeta: 'purple', morado: 'purple', champán: 'champagne', champan: 'champagne',
  dorado: 'champagne', amarillo: 'yellow', rosa: 'pink', rosado: 'pink',
};
const METAL = [
  [/acero.*oro rosa|oro rosa.*acero|rolesor/i, 'Steel & Rose Gold'], [/oro rosa|everose|sedna|rosa/i, 'Rose Gold'],
  [/oro blanco|platino/i, 'White Gold'], [/oro/i, 'Yellow Gold'], [/bronce/i, 'Bronze'], [/titanio/i, 'Titanium'],
  [/cer[aá]mica|negro|pvd|dlc/i, 'Black Ceramic'],
];

export function toTryOnProduct(watch) {
  const brand = watch.brand?.name ?? watch.brand_name ?? '';
  const color = (watch.dial_color ?? '').toLowerCase().split(/[\s/]+/)[0];
  return {
    name: `${brand} ${watch.name}`.trim(),
    referenceNumber: watch.reference,
    dialColor: DIAL[color] ?? (color || 'black'),
    caseDiameter: watch.case_diameter,
    caseMaterial: METAL.find(([re]) => re.test(watch.case_material ?? ''))?.[1] ?? 'Stainless Steel',
    movementType: (watch.movement ?? 'automatic').toUpperCase(),
  };
}
