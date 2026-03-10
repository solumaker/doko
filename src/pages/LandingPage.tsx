import { useState } from 'react';
import {
  ArrowRightLeft,
  ShieldCheck,
  Clock,
  Scale,
  Check,
  CheckCircle,
  Mail,
  Phone,
  ChevronDown,
  Menu,
  X,
  FileText,
  Globe,
  ClipboardList,
  Users,
  Building2,
} from 'lucide-react';

interface LandingPageProps {
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
}

export function LandingPage({ onNavigateToLogin, onNavigateToRegister }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-gray-50 text-slate-900 font-sans" style={{ scrollBehavior: 'smooth' }}>
      <Navbar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        onScrollTo={scrollTo}
        onLogin={onNavigateToLogin}
        onRegister={onNavigateToRegister}
      />
      <HeroSection onRegister={onNavigateToRegister} />
      <WhyDokoSection />
      <HowItWorksSection />
      <PricingSection onRegister={onNavigateToRegister} />
      <UpcomingSection />
      <FaqSection />
      <ContactSection />
      <Footer />
    </div>
  );
}

function Navbar({
  mobileMenuOpen,
  setMobileMenuOpen,
  onScrollTo,
  onLogin,
  onRegister,
}: {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  onScrollTo: (id: string) => void;
  onLogin: () => void;
  onRegister: () => void;
}) {
  return (
    <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-doko-blue rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">D</span>
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-doko-blue-900">DOKO</span>
          </div>

          <div className="hidden md:flex items-center space-x-8 font-medium">
            <button onClick={() => onScrollTo('como-funciona')} className="landing-nav-link transition text-slate-700">
              Como funciona
            </button>
            <button onClick={() => onScrollTo('planes')} className="landing-nav-link transition text-slate-700">
              Planes
            </button>
            <button onClick={() => onScrollTo('faq')} className="landing-nav-link transition text-slate-700">
              FAQ
            </button>
            <button onClick={onLogin} className="text-doko-blue hover:text-doko-blue-dark font-semibold transition">
              Iniciar sesion
            </button>
            <button
              onClick={onRegister}
              className="bg-doko-blue text-white px-6 py-3 rounded-full hover:bg-doko-blue-dark transition shadow-lg"
            >
              Pruebalo gratis
            </button>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 pb-6 pt-2 space-y-3">
          <button onClick={() => onScrollTo('como-funciona')} className="block w-full text-left py-2 font-medium text-slate-700">
            Como funciona
          </button>
          <button onClick={() => onScrollTo('planes')} className="block w-full text-left py-2 font-medium text-slate-700">
            Planes
          </button>
          <button onClick={() => onScrollTo('faq')} className="block w-full text-left py-2 font-medium text-slate-700">
            FAQ
          </button>
          <button onClick={onLogin} className="block w-full text-left py-2 text-doko-blue font-medium">
            Iniciar sesion
          </button>
          <button
            onClick={onRegister}
            className="block w-full bg-doko-blue text-white text-center px-6 py-3 rounded-full font-medium"
          >
            Pruebalo gratis
          </button>
        </div>
      )}
    </nav>
  );
}

function HeroSection({ onRegister }: { onRegister: () => void }) {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden landing-hero-gradient text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wide uppercase bg-white/20 rounded-full">
              Actualizado a la Ley de Transporte 2024
            </span>
            <h1 className="text-5xl lg:text-7xl font-extrabold leading-tight mb-6">
              Documento de Control Digital <span className="text-doko-green">en 1 minuto</span>
            </h1>
            <p className="text-xl text-blue-50 mb-10 leading-relaxed max-w-xl">
              La App mas sencilla para que transportistas y empresas cumplan con la normativa espanola de forma digital, segura y sin complicaciones.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onRegister}
                className="bg-white text-doko-blue px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition text-center"
              >
                Empezar ahora gratis
              </button>
            </div>
            <div className="mt-8 flex items-center gap-4 text-sm text-blue-100">
              <span className="flex items-center gap-1"><CheckCircle size={16} /> Sin tarjeta de credito</span>
              <span className="flex items-center gap-1"><CheckCircle size={16} /> Cumplimiento 100% legal</span>
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="relative z-10 rounded-2xl shadow-2xl overflow-hidden border-8 border-white/10">
              <img
                src="/DOKO_Header.jpeg"
                alt="DOKO Dashboard Preview"
                className="w-full"
              />
            </div>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-doko-green rounded-full flex items-center justify-center text-white font-bold text-center p-4 leading-tight shadow-xl rotate-12 text-sm">
              Digitaliza tu flota hoy!
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyDokoSection() {
  const cards = [
    {
      icon: <ArrowRightLeft size={24} />,
      bgColor: 'bg-doko-blue-100',
      textColor: 'text-doko-blue',
      title: 'Que cambia?',
      description: 'Adios al papel. La ley exige un formato digital inalterable para el transporte de mercancias.',
    },
    {
      icon: <ShieldCheck size={24} />,
      bgColor: 'bg-doko-green-100',
      textColor: 'text-doko-green-dark',
      title: 'Seguridad',
      description: 'Tus datos estan protegidos y disponibles en la nube 24/7 para cualquier inspeccion.',
    },
    {
      icon: <Clock size={24} />,
      bgColor: 'bg-doko-blue-100',
      textColor: 'text-doko-blue',
      title: 'Velocidad',
      description: 'Genera documentos en segundos desde el movil. No mas perdida de tiempo en la carga.',
    },
    {
      icon: <Scale size={24} />,
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-600',
      title: 'Validez Legal',
      description: 'Cumplimiento total con la Orden TMA/388/2021 del Ministerio de Transportes.',
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">El cambio regulatorio es obligatorio</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Desde ahora, el Documento de Control debe ser digital. DOKO te ayuda a transicionar sin fricciones.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {cards.map((card) => (
            <div key={card.title} className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl transition">
              <div className={`w-12 h-12 ${card.bgColor} ${card.textColor} rounded-lg flex items-center justify-center mb-6`}>
                {card.icon}
              </div>
              <h3 className="font-bold text-xl mb-3">{card.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { number: '1', title: 'Registrate', description: 'Crea tu cuenta de empresa o autonomo en menos de un minuto.' },
    { number: '2', title: 'Genera el documento', description: 'Introduce los datos de la carga, origen y destino. Todo pre-completado.' },
    { number: '3', title: 'Comparte', description: 'Envia el PDF al cargador y receptor mediante QR, enlace o email.' },
  ];

  return (
    <section id="como-funciona" className="py-24 bg-slate-50 relative overflow-hidden">
      <div className="landing-blob -top-20 -left-20" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">DOKO funciona en 3 simples pasos</h2>
          <p className="text-slate-600">Disenado para ser usado por conductores sin experiencia previa en software.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-12 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-doko-blue-100 -translate-y-1/2 hidden md:block" />
          {steps.map((step) => (
            <div key={step.number} className="relative z-10 text-center">
              <div className="w-16 h-16 bg-doko-blue text-white rounded-full flex items-center justify-center mx-auto mb-8 font-bold text-2xl border-4 border-white shadow-lg">
                {step.number}
              </div>
              <h3 className="font-bold text-xl mb-4 text-doko-blue-900">{step.title}</h3>
              <p className="text-slate-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection({ onRegister }: { onRegister: () => void }) {
  return (
    <section id="planes" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">Planes simples, sin sorpresas</h2>
          <p className="text-slate-600">Elige la opcion que mejor se adapte a tu volumen de transporte.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <div className="landing-pricing-card p-8 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col">
            <div className="mb-8">
              <h3 className="font-bold text-sm text-slate-500 uppercase tracking-widest mb-4">Autonomo</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900">39&euro;</span>
                <span className="text-slate-500 text-sm">/anual</span>
              </div>
              <p className="text-sm text-slate-400 mt-2">Para 1 vehiculo</p>
            </div>
            <ul className="space-y-3 mb-8 text-slate-600 text-sm flex-1">
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Documentos ilimitados</li>
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Firma digital</li>
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> QR de inspeccion</li>
            </ul>
            <button onClick={onRegister} className="mt-auto block w-full text-center border-2 border-doko-blue text-doko-blue font-bold py-3.5 rounded-xl hover:bg-doko-blue-50 transition">
              Probar gratis
            </button>
          </div>

          <div className="landing-pricing-card p-8 rounded-3xl bg-doko-blue text-white flex flex-col shadow-2xl relative" style={{ boxShadow: '0 20px 60px rgba(18,100,171,0.35)' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-doko-green text-white font-bold px-4 py-1 rounded-full text-xs uppercase tracking-widest">
              Recomendado
            </div>
            <div className="mb-8">
              <h3 className="font-bold text-sm text-blue-200 uppercase tracking-widest mb-4">Flota Media</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">99&euro;</span>
                <span className="text-blue-200 text-sm">/anual</span>
              </div>
              <p className="text-sm text-blue-200 mt-2">Hasta 5 vehiculos</p>
            </div>
            <ul className="space-y-3 mb-8 text-blue-50 text-sm flex-1">
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Documentos ilimitados</li>
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Panel de administracion</li>
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Gestion de choferes</li>
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Soporte prioritario</li>
            </ul>
            <button onClick={onRegister} className="mt-auto block w-full text-center bg-white text-doko-blue font-bold py-3.5 rounded-xl hover:bg-gray-100 transition">
              Probar gratis
            </button>
          </div>

          <div className="landing-pricing-card p-8 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col">
            <div className="mb-8">
              <h3 className="font-bold text-sm text-slate-500 uppercase tracking-widest mb-4">Gran Flota</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900">249&euro;</span>
                <span className="text-slate-500 text-sm">/anual</span>
              </div>
              <p className="text-sm text-slate-400 mt-2">Vehiculos ilimitados</p>
            </div>
            <ul className="space-y-3 mb-8 text-slate-600 text-sm flex-1">
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Integracion API</li>
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Facturacion masiva</li>
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Account Manager</li>
            </ul>
            <button onClick={onRegister} className="mt-auto block w-full text-center border-2 border-doko-blue text-doko-blue font-bold py-3.5 rounded-xl hover:bg-doko-blue-50 transition">
              Probar gratis
            </button>
          </div>

          <div className="landing-pricing-card p-8 rounded-3xl bg-slate-900 border border-slate-700 flex flex-col">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={18} className="text-doko-green" />
                <h3 className="font-bold text-sm text-doko-green uppercase tracking-widest">Grandes Empresas</h3>
              </div>
              <p className="text-xl font-extrabold text-white mb-3">Plan a medida</p>
              <p className="text-sm text-slate-400 leading-relaxed">
                Tienes mas de 200 vehiculos o necesitas una solucion personalizada? Hablemos sobre tus necesidades.
              </p>
            </div>
            <ul className="space-y-3 mb-8 text-slate-300 text-sm flex-1">
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Volumen y usuarios a medida</li>
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Integraciones personalizadas</li>
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Soporte dedicado</li>
            </ul>
            <button className="mt-auto block w-full text-center bg-doko-green text-white font-bold py-3.5 rounded-xl hover:bg-doko-green-dark transition">
              Contactar con Ventas
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function UpcomingSection() {
  const items = [
    {
      icon: <FileText size={22} />,
      title: 'Carta de Porte Digital',
      description:
        'Crea y firma contratos de transporte de mercancias de forma digital mediante firma electronica avanzada. Preparado para el cumplimiento de la normativa europea eFTI y para la digitalizacion de la documentacion del transporte por carretera.',
    },
    {
      icon: <Globe size={22} />,
      title: 'eCMR',
      description:
        'Genera y firma la carta de porte internacional electronica (eCMR) con firma digital avanzada. Cumple con el protocolo eCMR y facilita la gestion digital del transporte internacional de mercancias.',
    },
    {
      icon: <ClipboardList size={22} />,
      title: 'Acta de Transporte',
      description:
        'Registra los eventos del transporte en tiempo real: hora de llegada a la carga, inicio y fin de carga, llegada a descarga, finalizacion de descarga, incidencias, observaciones, fotografias y comprobantes de recogida y entrega mediante firma digital.',
    },
    {
      icon: <Users size={22} />,
      title: 'Sistema de referidos',
      description:
        'Si trabajas con transportistas colaboradores o flotas externas, podras invitarles a utilizar DOKO mediante codigos de descuento. Facilita la adopcion del sistema en toda tu red de transporte y mejora la coordinacion documental entre cargadores y transportistas.',
    },
  ];

  return (
    <section className="py-24 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest uppercase bg-doko-green/20 text-doko-green rounded-full border border-doko-green/30">
            Roadmap
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-5">Proximas actualizaciones</h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Estamos ampliando DOKO para cubrir toda la documentacion del transporte de mercancias por carretera y facilitar el cumplimiento de la normativa digital del sector.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {items.map((item) => (
            <div
              key={item.title}
              className="group relative bg-slate-800/60 border border-slate-700 hover:border-doko-blue/50 rounded-2xl p-8 transition-all duration-300 hover:bg-slate-800"
            >
              <div className="absolute top-6 right-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase bg-doko-blue/20 text-doko-blue-200 border border-doko-blue/30">
                  Proximamente
                </span>
              </div>
              <div className="w-12 h-12 bg-doko-blue/20 text-doko-blue-200 rounded-xl flex items-center justify-center mb-5 group-hover:bg-doko-blue/30 transition">
                {item.icon}
              </div>
              <h3 className="font-bold text-xl text-white mb-3">{item.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'Es legalmente valido en Espana?',
      answer: 'Si, DOKO cumple estrictamente con el Reglamento de Ordenacion de los Transportes Terrestres (ROTT) y las ultimas ordenes ministeriales sobre documentacion digital.',
    },
    {
      question: 'Que pasa si no tengo conexion a internet?',
      answer: 'Nuestra App permite generar borradores offline que se sincronizan automaticamente en cuanto recuperas cobertura.',
    },
    {
      question: 'Puedo compartir el documento con el cliente?',
      answer: 'Por supuesto. Al finalizar, se genera un codigo QR o un enlace que puedes compartir por WhatsApp o Email al cargador y consignatario.',
    },
  ];

  return (
    <section id="faq" className="py-24 bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-12">Preguntas frecuentes</h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white p-6 rounded-2xl border border-slate-200 transition">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex justify-between items-center text-left font-bold text-lg"
              >
                {faq.question}
                <ChevronDown
                  size={20}
                  className={`shrink-0 ml-2 transition-transform text-doko-blue ${openIndex === index ? 'rotate-180' : ''}`}
                />
              </button>
              {openIndex === index && (
                <p className="mt-4 text-slate-600">{faq.answer}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-extrabold mb-6">
              Tienes dudas?<br />
              <span className="text-doko-blue">Escribenos!</span>
            </h2>
            <p className="text-lg text-slate-600 mb-8">
              Nuestro equipo de expertos en normativa de transporte te ayudara a digitalizar tu operativa en minutos.
            </p>
            <div className="space-y-6 font-medium">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-doko-blue-100 text-doko-blue rounded-full flex items-center justify-center">
                  <Mail size={20} />
                </div>
                <span>soporte@doko.es</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-doko-green-100 text-doko-green-dark rounded-full flex items-center justify-center">
                  <Phone size={20} />
                </div>
                <span>+34 900 000 000</span>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 p-10 rounded-3xl border border-slate-200 shadow-xl">
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div className="grid md:grid-cols-2 gap-4">
                <input type="text" placeholder="Nombre" className="w-full px-5 py-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-doko-blue outline-none" />
                <input type="email" placeholder="Email" className="w-full px-5 py-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-doko-blue outline-none" />
              </div>
              <input type="text" placeholder="Empresa" className="w-full px-5 py-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-doko-blue outline-none" />
              <textarea rows={4} placeholder="En que podemos ayudarte?" className="w-full px-5 py-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-doko-blue outline-none resize-none" />
              <button className="w-full bg-doko-blue text-white font-bold py-4 rounded-xl hover:bg-doko-blue-dark transition shadow-lg">
                Enviar mensaje
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-doko-blue-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-doko-blue rounded flex items-center justify-center">
                <span className="text-white font-bold text-lg">D</span>
              </div>
              <span className="text-2xl font-bold tracking-tight">DOKO</span>
            </div>
            <p className="text-blue-200 text-sm leading-relaxed">
              Digitalizando el sector del transporte para hacerlo mas eficiente, sostenible y legal.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-6">Producto</h4>
            <ul className="space-y-3 text-blue-200 text-sm">
              <li><a href="#" className="hover:text-white transition">Caracteristicas</a></li>
              <li><a href="#como-funciona" className="hover:text-white transition">Como funciona</a></li>
              <li><a href="#planes" className="hover:text-white transition">Planes de precios</a></li>
              <li><a href="#" className="hover:text-white transition">Actualizaciones</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6">Compania</h4>
            <ul className="space-y-3 text-blue-200 text-sm">
              <li><a href="#" className="hover:text-white transition">Sobre nosotros</a></li>
              <li><a href="#" className="hover:text-white transition">Contacto</a></li>
              <li><a href="#" className="hover:text-white transition">Blog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6">Legal</h4>
            <ul className="space-y-3 text-blue-200 text-sm">
              <li><a href="#" className="hover:text-white transition">Terminos y condiciones</a></li>
              <li><a href="#" className="hover:text-white transition">Privacidad</a></li>
              <li><a href="#" className="hover:text-white transition">Normativa TMA/388/2021</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-blue-300">
          <p>2024 DOKO Software para Transporte. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
