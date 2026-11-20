export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <p className="text-gold tracking-[0.3em] text-xs mb-3">CRONOS GENÈVE</p>
        <h1 className="font-serif text-4xl text-charcoal mb-6">Nuestra Historia</h1>
      </div>
      <div className="prose prose-lg mx-auto text-gray-600 space-y-6">
        <p>Cronos Genève nace de la pasión por la alta relojería y el compromiso con la excelencia. Nuestra plataforma reúne las piezas más distinguidas de las casas relojeras más prestigiosas del mundo.</p>
        <p>Cada reloj en nuestra colección ha sido cuidadosamente seleccionado por su maestría técnica, diseño excepcional y herencia relojera. Creemos que un reloj es más que un instrumento para medir el tiempo: es una obra de arte, una declaración de estilo y un legado que trasciende generaciones.</p>
        <div className="grid md:grid-cols-3 gap-8 py-8">
          {[
            { n: 'Autenticidad', d: 'Garantizamos la autenticidad de cada pieza en nuestra colección.' },
            { n: 'Excelencia', d: 'Seleccionamos solo relojes que cumplen los más altos estándares.' },
            { n: 'Servicio', d: 'Ofrecemos asesoría personalizada para cada cliente.' },
          ].map((v) => (
            <div key={v.n} className="text-center">
              <h3 className="font-serif text-xl text-charcoal mb-2">{v.n}</h3>
              <p className="text-sm">{v.d}</p>
            </div>
          ))}
        </div>
        <p>Con sede en el corazón de la tradición relojera, Cronos Genève se posiciona como el destino definitivo para los amantes de la relojería de lujo.</p>
      </div>
    </div>
  );
}
