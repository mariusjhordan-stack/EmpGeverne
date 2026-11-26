/** true en la "vitrina" estática (Firebase Hosting): sin servidor, el catálogo sale de /static-api/*.json. */
export const VITRINA = import.meta.env.VITE_VITRINA === '1';

export const VITRINA_NOTICE = 'Esta es una vitrina de demostración: las cuentas, el carrito y las compras están desactivados.';
