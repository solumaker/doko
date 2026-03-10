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
    <div className="bg-white text-slate-900 font-sans" style={{ scrollBehavior: 'smooth' }}>
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
      <CallToActionBanner onRegister={onNavigateToRegister} />
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
    <nav className="fixed w-full z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <img
              src="/DOKO_Header.jpeg"
              alt="DOKO"
              className="h-9 w-auto object-contain"
            />
          </div>

          <div className="hidden md:flex items-center space-x-8 font-medium">
            <button onClick={() => onScrollTo('como-funciona')} className="landing-nav-link transition text-slate-600 hover:text-doko-blue text-sm">
              Como funciona
            </button>
            <button onClick={() => onScrollTo('planes')} className="landing-nav-link transition text-slate-600 hover:text-doko-blue text-sm">
              Planes
            </button>
            <button onClick={() => onScrollTo('faq')} className="landing-nav-link transition text-slate-600 hover:text-doko-blue text-sm">
              FAQ
            </button>
            <button onClick={onLogin} className="text-slate-700 hover:text-doko-blue font-semibold transition text-sm">
              Iniciar sesion
            </button>
            <button
              onClick={onRegister}
              className="bg-doko-blue text-white px-5 py-2.5 rounded-full hover:bg-doko-blue-dark transition shadow-md text-sm font-semibold"
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
            className="block w-full bg-doko-blue text-white text-center px-6 py-3 rounded-full font-semibold"
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
    <section className="relative pt-28 pb-20 lg:pt-40 lg:pb-32 overflow-hidden landing-hero-gradient text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-doko-green/10 rounded-full blur-3xl" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest uppercase bg-white/15 border border-white/20 rounded-full text-white">
              Actualizado a la Ley de Transporte 2024
            </span>
            <h1 className="text-3xl lg:text-6xl font-extrabold leading-tight mb-6 text-white">
              Crea tu Documento de Control digital{' '}
              <span className="text-doko-green">en 1 minuto</span>
            </h1>
            <p className="text-lg text-blue-100 mb-10 leading-relaxed max-w-xl">
             Crea, comparte y archiva el Documento de Control desde el móvil. Sin papel, sin líos, sin versiones duplicadas.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onRegister}
                className="bg-white text-doko-blue px-8 py-4 rounded-xl font-bold text-base hover:bg-gray-50 transition shadow-lg text-center"
              >
                Comenzar gratis
              </button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-5 text-sm text-blue-100">
              <span className="flex items-center gap-1.5"><CheckCircle size={16} className="text-doko-green" /> Sin tarjeta de credito</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={16} className="text-doko-green" /> Cumplimiento 100% legal</span>
            </div>
          </div>
          <div className="hidden lg:flex justify-center">
            <img
              src="/doko_mockup_movil.png"
              alt="DOKO App Preview"
              className="w-72 drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyDokoSection() {
  const cards = [
    {
      icon: <ArrowRightLeft size={22} />,
      bgColor: 'bg-doko-green',
      textColor: 'text-white',
      title: '¿Que cambia?',
      description: 'La Ley de Movilidad Sostenible exige el Documento de Control de Transporte de mercancías por carretera en formato electrónico a partir del 05 de octubre de 2026.',
    },
    {
      icon: <ShieldCheck size={22} />,
      bgColor: 'bg-doko-green',
      textColor: 'text-white',
      title: '¿Qué ocurre si esperas?',
      description: 'Las empresas que no se preparen a tiempo pueden sufrir incidencias en inspecciones, desorden documental y más carga administrativa.',
    },
    {
      icon: <Clock size={22} />,
      bgColor: 'bg-doko-green',
      textColor: 'text-white',
      title: '¿Por qué anticiparse?',
      description: 'Las empresas que se adapten con antelación evitarán sanciones, incidencias en inspecciones y duplicidad de tareas.',
    },
    {
      icon: <Scale size={22} />,
      bgColor: 'bg-doko-green',
      textColor: 'text-white',
      title: 'Validez Legal',
      description: 'Los documentos generados incluyen: Código QR verificable, formato PDF/A-1A e historial por 1 año.',
    },
  ];

  return (
    <section className="py-24 bg-doko-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 mb-4 text-xs font-bold tracking-widest uppercase bg-doko-blue/10 text-doko-blue rounded-full border border-doko-blue/20">
            Cambio regulatorio
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">El Documento de Control ahora sera digital</h2>
          <p className="text-base text-slate-600 max-w-2xl mx-auto">
            A partir del 5 de octubre de 2026, el Documento de Control Administrativo deberá gestionarse exclusivamente en formato digital en España.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card) => (
            <div key={card.title} className="p-8 rounded-2xl bg-white border border-slate-100 hover:shadow-xl transition shadow-sm">
              <div className={`w-12 h-12 ${card.bgColor} ${card.textColor} rounded-xl flex items-center justify-center mb-6 shadow-sm`}>
                {card.icon}
              </div>
              <h3 className="font-bold text-lg mb-3 text-slate-900">{card.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { number: '1', label: 'PASO 1', title: 'Regístrate', description: 'Da de alta tu empresa, tus usuarios de oficina y conductores' },
    { number: '2', label: 'PASO 2', title: 'Crea', description: 'Genera documentos desde oficina o tus conductores directamente.' },
    { number: '3', label: 'PASO 3', title: 'Comparte', description: 'Comparte con las personas Involucradas de la formas más sencilla. Whatsapp de forma nativa.' },
  ];

  return (
    <section id="como-funciona" className="py-24 bg-white relative overflow-hidden">
      <div className="landing-blob -top-20 -left-20 opacity-50" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">Cómo funciona</h2>
          <p className="text-slate-500">Diseñado para ser usado por conductores sin experiencia previa en software.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-10 relative">
          <div className="absolute top-10 left-0 w-full h-0.5 bg-doko-blue/20 hidden md:block" />
          {steps.map((step) => (
            <div key={step.number} className="relative z-10 text-center">
              <p className="text-xs font-bold tracking-widest text-doko-blue uppercase mb-4">{step.label}</p>
              <div className="w-14 h-14 bg-doko-blue text-white rounded-full flex items-center justify-center mx-auto mb-6 font-bold text-xl border-4 border-white shadow-lg">
                {step.number}
              </div>
              <h3 className="font-bold text-lg mb-3 text-slate-900">{step.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed px-4">{step.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-16">
          <img
            src="/doko_mockup_pc.png"
            alt="DOKO Desktop Preview"
            className="w-full rounded-2xl shadow-xl"
          />
        </div>
      </div>
    </section>
  );
}

function PricingSection({ onRegister }: { onRegister: () => void }) {
  return (
    <section id="planes" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">Planes simples, sin sorpresas</h2>
          <p className="text-slate-500">Elige la opcion que mejor se adapte a tu volumen de transporte.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto items-stretch">
          <div className="landing-pricing-card p-8 rounded-3xl bg-white border border-slate-200 flex flex-col shadow-sm">
            <div className="mb-8">
              <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest mb-4">Autónomo</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl text-slate-900">39&euro;</span>
                <span className="text-slate-400 text-sm">/anual</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Enfocado a 1 camión</p>
            </div>
            <ul className="space-y-3 mb-8 text-slate-600 text-sm flex-1">
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> 100 documentos/mes</li>
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Usuarios ilimitados</li>
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Validez legal</li>
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Soporte por email</li>
            </ul>
            <button onClick={onRegister} className="mt-auto block w-full text-center bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-700 transition">
              Probar gratis
            </button>
          </div>

          <div className="landing-pricing-card p-8 rounded-3xl bg-doko-blue text-white flex flex-col shadow-2xl relative scale-105" style={{ boxShadow: '0 20px 60px rgba(18,100,171,0.35)' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-doko-green text-white font-bold px-4 py-1 rounded-full text-xs uppercase tracking-widest shadow-md">
              Recomendado
            </div>
            <div className="mb-8">
              <h3 className="font-bold text-xs text-blue-200 uppercase tracking-widest mb-4">Pymes</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl text-white">99&euro;</span>
                <span className="text-blue-200 text-sm">/anual</span>
              </div>
              <p className="text-xs text-blue-200 mt-2">Enfocado a flotas de hasta 10 camiones</p>
            </div>
            <ul className="space-y-3 mb-8 text-blue-50 text-sm flex-1">
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> 500 documentos/mes</li>
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Usuarios ilimitados</li>
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Validez legal</li>
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Soporte prioritario por email</li>
            </ul>
            <button onClick={onRegister} className="mt-auto block w-full text-center bg-white text-doko-blue font-bold py-3.5 rounded-xl hover:bg-gray-50 transition shadow-md">
              Probar gratis
            </button>
          </div>

          <div className="landing-pricing-card p-8 rounded-3xl bg-white border border-slate-200 flex flex-col shadow-sm">
            <div className="mb-8">
              <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest mb-4">Flotas</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl text-slate-900">249&euro;</span>
                <span className="text-slate-400 text-sm">/anual</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Enfocado a empresas de hasta 200 camiones</p>
            </div>
            <ul className="space-y-3 mb-8 text-slate-600 text-sm flex-1">
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> 2.500 documentos/mes</li>
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Usuarios ilimitados</li>
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Validez legal</li>
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Soporte prioritario por email y teléfono</li>
            </ul>
            <button onClick={onRegister} className="mt-auto block w-full text-center bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-700 transition">
              Probar gratis
            </button>
          </div>

          <div className="landing-pricing-card p-8 rounded-3xl bg-white border border-slate-200 flex flex-col shadow-sm">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={16} className="text-doko-green" />
                <h3 className="font-bold text-xs text-doko-green uppercase tracking-widest">Grandes Empresas</h3>
              </div>
              <p className="text-xl font-bold text-slate-900 mb-3">Plan a medida</p>
              <p className="text-sm text-slate-500 leading-relaxed">
                Tienes mas de 200 vehiculos o necesitas una solucion personalizada? Hablemos sobre tus necesidades.
              </p>
            </div>
            <ul className="space-y-3 mb-8 text-slate-600 text-sm flex-1">
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Volumen y usuarios a medida</li>
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Integraciones personalizadas</li>
              <li className="flex items-center gap-3"><Check size={15} className="text-doko-green shrink-0" /> Soporte dedicado</li>
            </ul>
            <button className="mt-auto block w-full text-center bg-doko-green text-white font-bold py-3.5 rounded-xl hover:bg-doko-green-dark transition">
              Contactar con Ventas
            </button>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-slate-500">
          <span className="flex items-center gap-2"><CheckCircle size={16} className="text-doko-green" /> Sin permanencia</span>
          <span className="flex items-center gap-2"><CheckCircle size={16} className="text-doko-green" /> Configuracion en menos de 5 minutos</span>
          <span className="flex items-center gap-2"><CheckCircle size={16} className="text-doko-green" /> Soporte incluido</span>
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
        'Crea y firma contratos de transporte de mercancias de forma digital mediante firma electronica avanzada. Preparado para el cumplimiento de la normativa europea eFTI.',
    },
    {
      icon: <Globe size={22} />,
      title: 'eCMR',
      description:
        'Genera y firma la carta de porte internacional electronica (eCMR) con firma digital avanzada. Cumple con el protocolo eCMR y facilita la gestion digital del transporte internacional.',
    },
    {
      icon: <ClipboardList size={22} />,
      title: 'Acta de Transporte',
      description:
        'Registra los eventos del transporte en tiempo real: hora de llegada, inicio y fin de carga, incidencias, fotografias y comprobantes de recogida y entrega mediante firma digital.',
    },
    {
      icon: <Users size={22} />,
      title: 'Sistema de referidos',
      description:
        'Invita a transportistas colaboradores o flotas externas mediante codigos de descuento. Facilita la adopcion del sistema en toda tu red de transporte.',
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-5">Próximas actualizaciones</h2>
          <p className="text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Estamos ampliando DOKO para cubrir toda la documentacion del transporte de mercancias por carretera y facilitar el cumplimiento de la normativa digital del sector.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {items.map((item) => (
            <div
              key={item.title}
              className="group relative bg-slate-50 border border-slate-200 hover:border-doko-blue/40 rounded-2xl p-8 transition-all duration-300 hover:shadow-lg hover:bg-white"
            >
              <div className="absolute top-6 right-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase bg-doko-blue text-white shadow-sm">
                  Próximamente
                </span>
              </div>
              <div className="w-12 h-12 bg-doko-blue text-white rounded-xl flex items-center justify-center mb-5 shadow-sm">
                {item.icon}
              </div>
              <h3 className="font-bold text-xl text-slate-900 mb-3">{item.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{item.description}</p>
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
      question: '¿DOKO sustituye al Documento de Control en papel?',
      answer: 'Si, DOKO digitaliza la creación y archivo del Documento de Control. La versión digital es accesible desde cualquier dispositivo. Si la normativa requiere una copia impresa, puedes descargarla o imprimirla en cualquier momento desde la plataforma.',
    },
    {
      question: '¿Es complicado de usar?',
      answer: 'No, DOKO está pensado para personas que no son técnicas. En 10 minutos cargas tus datos y ya puedes crear documentos. La plantilla guiada te asegura que no te dejas nada.',
    },
    {
      question: '¿Cuánto tiempo tarda en funcionar?',
      answer: 'El registro es inmediato y crear un Documento de Control lleva menos de 1 minuto por viaje.',
    },
    {
      question: '¿Mis conductores necesitan formación?',
      answer: 'No. La interfaz de DOKO esta diseñada para que cualquier conductor pueda usarla. solo necesitan abrir un enlace o escanear un QR para ver el documento. No necesitan crear cuenta ni instalar nada.',
    },
    {
      question: '¿Qué pasa con mis datos?',
      answer: 'Tus datos se almacenan de forma segura en la nube. No los compartimos con terceros. Solo los usamos para que DOKO funcione correctamente y para coordinar tu demo si la solicitas.',
    },
  ];

  return (
    <section id="faq" className="py-24 bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl lg:text-4xl font-bold text-center text-slate-900 mb-4">Preguntas frecuentes</h2>
        <p className="text-center text-slate-500 mb-12">Todo lo que necesitas saber antes de empezar.</p>
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition shadow-sm">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex justify-between items-center text-left font-semibold text-base text-slate-900 px-6 py-5"
              >
                {faq.question}
                <ChevronDown
                  size={20}
                  className={`shrink-0 ml-4 transition-transform text-doko-blue ${openIndex === index ? 'rotate-180' : ''}`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5">
                  <p className="text-slate-600 text-sm leading-relaxed">{faq.answer}</p>
                </div>
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
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">¿Tienes dudas? Escríbenos!</h2>
          <p className="text-slate-500">Respondemos en menos de 24 horas.</p>
        </div>
        <div className="grid lg:grid-cols-2 gap-16 items-start max-w-5xl mx-auto">
          <div className="pt-4">
            <p className="text-base text-slate-600 mb-8 leading-relaxed">
              Nuestro equipo de expertos en normativa de transporte te ayudara a digitalizar tu operativa en minutos.
            </p>
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-doko-blue-50 text-doko-blue rounded-xl flex items-center justify-center shrink-0 border border-doko-blue/10">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">Email</p>
                  <span className="font-semibold text-slate-800">hola@documentocontroltransporte.com</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-doko-green-50 text-doko-green-dark rounded-xl flex items-center justify-center shrink-0 border border-doko-green/10">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">Teléfono</p>
                  <span className="font-semibold text-slate-800">+34 637 510 860</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-md">
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <input type="text" placeholder="Nombre" className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-doko-blue outline-none text-sm text-slate-800 placeholder-slate-400" />
              <input type="text" placeholder="Teléfono" className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-doko-blue outline-none text-sm text-slate-800 placeholder-slate-400" />
              <input type="email" placeholder="Correo" className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-doko-blue outline-none text-sm text-slate-800 placeholder-slate-400" />
              <input type="text" placeholder="Nombre de Empresa" className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-doko-blue outline-none text-sm text-slate-800 placeholder-slate-400" />
              <input type="text" placeholder="Población" className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-doko-blue outline-none text-sm text-slate-800 placeholder-slate-400" />
              <button className="w-full bg-doko-blue text-white font-bold py-4 rounded-xl hover:bg-doko-blue-dark transition shadow-md">
                Enviar mensaje
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

function CallToActionBanner({ onRegister }: { onRegister: () => void }) {
  return (
    <section className="landing-hero-gradient py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl lg:text-5xl font-extrabold text-white mb-6 leading-tight">
          Preparate hoy para la obligatoriedad del{' '}
          <span className="text-doko-green">Documento de Control digital</span>
        </h2>
        <button
          onClick={onRegister}
          className="inline-block bg-white text-doko-blue font-bold px-10 py-4 rounded-full text-base hover:bg-gray-50 transition shadow-xl mt-2"
        >
          Comenzar gratis
        </button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-doko-blue rounded flex items-center justify-center shrink-0">
                <span className="text-white font-extrabold text-base">D</span>
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">DOKO</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Digitalizando el sector del transporte para hacerlo mas eficiente, sostenible y legal.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-white text-sm uppercase tracking-wide">Empresa</h4>
            <ul className="space-y-3 text-slate-400 text-sm">
              <li><a href="#" className="hover:text-white transition">Sobre nosotros</a></li>
              <li><a href="#como-funciona" className="hover:text-white transition">Como funciona</a></li>
              <li><a href="#planes" className="hover:text-white transition">Planes de precios</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-white text-sm uppercase tracking-wide">Legal</h4>
            <ul className="space-y-3 text-slate-400 text-sm">
              <li><a href="#" className="hover:text-white transition">Terminos y condiciones</a></li>
              <li><a href="#" className="hover:text-white transition">Privacidad</a></li>
              <li><a href="#" className="hover:text-white transition">Normativa TMA/388/2021</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-white text-sm uppercase tracking-wide">Contacto</h4>
            <ul className="space-y-3 text-slate-400 text-sm">
              <li className="flex items-center gap-2"><Mail size={14} /> hola@documentocontroltransporte.com</li>
              <li className="flex items-center gap-2"><Phone size={14} />+34 637 510 860</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>2026 DOKO Software para Transporte. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
