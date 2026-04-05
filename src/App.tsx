import React, { useState, useEffect } from "react";
import { 
  BookOpen, 
  FileText, 
  Settings, 
  Download, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Calendar,
  LayoutGrid,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Zap,
  Presentation,
  X,
  Maximize2,
  Minimize2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";
import { generateOutline, generateClassDetail } from "./services/gemini";
import { AnnualPlan, PlanningInput, WizardStep, Complexity, ClassPlan, GenerationStatus } from "./types";

export default function App() {
  const [input, setInput] = useState<PlanningInput>({
    syllabus: "",
    methodology: "Enfoque constructivista, participativo y práctico.",
    teacherProfile: "Docente de secundaria con interés en motivar a los alumnos.",
    bibliography: "",
    complexity: "normal"
  });
  const [wizardStep, setWizardStep] = useState<WizardStep>("syllabus");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [progressMessage, setProgressMessage] = useState("");
  const [plan, setPlan] = useState<AnnualPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<{tId: string, bId: string, cId: string} | null>(null);
  const [showSlides, setShowSlides] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedInput = localStorage.getItem("planner_input");
    const savedPlan = localStorage.getItem("planner_plan");
    if (savedInput) setInput(JSON.parse(savedInput));
    if (savedPlan) setPlan(JSON.parse(savedPlan));
    
    document.documentElement.classList.add('dark');
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("planner_input", JSON.stringify(input));
  }, [input]);

  useEffect(() => {
    if (plan) {
      localStorage.setItem("planner_plan", JSON.stringify(plan));
    }
  }, [plan]);

  const handleNext = () => {
    const steps: WizardStep[] = ["syllabus", "methodology", "profile", "outline", "bibliography", "classes"];
    const currentIndex = steps.indexOf(wizardStep);
    if (currentIndex < steps.length - 1) {
      setWizardStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: WizardStep[] = ["syllabus", "methodology", "profile", "outline", "bibliography", "classes"];
    const currentIndex = steps.indexOf(wizardStep);
    if (currentIndex > 0) {
      setWizardStep(steps[currentIndex - 1]);
    }
  };

  const handleGenerateOutline = async () => {
    if (!input.syllabus) {
      setError("Por favor, ingresa el programa de la materia.");
      return;
    }
    setError(null);
    setStatus("generating");
    setProgressMessage("Creando cronograma basado en tu programa...");
    try {
      const result = await generateOutline(input);
      setPlan(result);
      setStatus("completed");
      setWizardStep("outline");
    } catch (err: any) {
      setError(err.message || "Error al generar el cronograma.");
      setStatus("error");
    }
  };

  const handleGenerateClass = async (tId: string, bId: string, cId: string) => {
    if (!plan) return;
    setStatus("generating");
    setProgressMessage("Desarrollando el contenido de la clase...");
    try {
      const trimester = plan.trimesters.find(t => t.id === tId);
      const block = trimester?.blocks.find(b => b.id === bId);
      const cls = block?.classes.find(c => c.id === cId);
      if (!cls || !trimester || !block) return;

      const details = await generateClassDetail(input, cls.title, trimester.title, block.title);
      const newPlan = { ...plan };
      const tIdx = newPlan.trimesters.findIndex(t => t.id === tId);
      const bIdx = newPlan.trimesters[tIdx].blocks.findIndex(b => b.id === bId);
      const cIdx = newPlan.trimesters[tIdx].blocks[bIdx].classes.findIndex(c => c.id === cId);
      newPlan.trimesters[tIdx].blocks[bIdx].classes[cIdx] = details;
      setPlan(newPlan);
      setStatus("completed");
    } catch (err: any) {
      setError(err.message || "Error al generar la clase.");
      setStatus("error");
    }
  };

  const currentClassData = selectedClass && plan 
    ? plan.trimesters.find(t => t.id === selectedClass.tId)
        ?.blocks.find(b => b.id === selectedClass.bId)
        ?.classes.find(c => c.id === selectedClass.cId)
    : null;

  const downloadHTML = () => {
    if (!plan) return;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Planificación Anual - ${new Date().getFullYear()}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #f8fafc; background: #020617; max-width: 1000px; margin: 0 auto; padding: 60px 20px; }
          h1 { color: #3b82f6; font-size: 3rem; border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 40px; }
          h2 { color: #60a5fa; font-size: 2rem; margin-top: 60px; border-left: 6px solid #3b82f6; padding-left: 20px; }
          h3 { color: #94a3b8; font-size: 1.5rem; margin-top: 40px; background: #0f172a; padding: 15px; border-radius: 12px; }
          .class-card { border: 1px solid #1e293b; border-radius: 24px; padding: 40px; margin-bottom: 30px; background: #0f172a; page-break-inside: avoid; }
          .class-title { font-weight: 800; font-size: 1.75rem; color: #fff; margin-bottom: 20px; }
          .section-title { font-weight: 700; color: #3b82f6; margin-top: 25px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.8rem; }
          ul { margin: 0; padding-left: 25px; color: #cbd5e1; }
          p { color: #cbd5e1; }
          .bibliography { font-style: italic; color: #64748b; font-size: 0.9rem; margin-top: 20px; padding-top: 20px; border-top: 1px solid #1e293b; }
          @media print {
            body { padding: 0; background: white; color: black; }
            h1, h2, h3 { color: black; border-color: #ccc; }
            .class-card { border-color: #ccc; background: white; }
            .section-title { color: #333; }
            p, ul, li { color: black; }
          }
        </style>
      </head>
      <body>
        <h1>Planificación Anual Estructurada</h1>
        ${plan.trimesters.map(t => `
          <h2>${t.title}</h2>
          ${t.blocks.map(b => `
            <h3>${b.title}</h3>
            ${b.classes.map(c => `
              <div class="class-card">
                <div class="class-title">${c.title}</div>
                ${c.isGenerated ? `
                  <div class="section-title">Objetivos:</div>
                  <ul>${c.objectives.map(o => `<li>${o}</li>`).join('')}</ul>
                  <div class="section-title">Desarrollo de la clase:</div>
                  <div style="margin-bottom: 20px;">${c.contents.map(cont => `<p>${cont}</p>`).join('')}</div>
                  <div class="section-title">Actividad:</div>
                  <p>${c.activity}</p>
                  <div class="section-title">Evaluación:</div>
                  <p>${c.evaluation}</p>
                  <div class="section-title">Bibliografía:</div>
                  <div class="bibliography">${c.bibliography.join('<br>')}</div>
                ` : '<p><i>Detalle no generado aún.</i></p>'}
              </div>
            `).join('')}
          `).join('')}
        `).join('')}
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Planificacion_${new Date().getFullYear()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-900/30">
      {/* Header */}
      <header className="bg-slate-900/50 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-900/20">
              <BookOpen className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Planificador Docente</h1>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Asistente Inteligente</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if(confirm("¿Estás seguro de que quieres borrar todo y empezar una nueva planificación?")) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="text-sm font-bold text-slate-500 hover:text-red-400 transition-colors px-4 py-2"
            >
              Nueva Planificación
            </button>
            {plan && (
              <button 
                onClick={() => setWizardStep("classes")}
                className="text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors px-4 py-2"
              >
                Ver Todo el Plan
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {/* Step 1: Syllabus */}
          {wizardStep === "syllabus" && (
            <motion.div 
              key="syllabus"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white">¡Hola! Empecemos con tu materia.</h2>
                <p className="text-slate-400 text-lg">Paso 1: Pega aquí el programa o los temas que debes dar este año. No te preocupes por el formato, la IA lo entenderá.</p>
              </div>
              <textarea 
                className="w-full h-64 p-6 rounded-2xl bg-slate-900 border border-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-lg text-slate-200 placeholder:text-slate-700"
                placeholder="Ej: Unidad 1: Introducción a la Biología. Unidad 2: La Célula..."
                value={input.syllabus}
                onChange={(e) => setInput({ ...input, syllabus: e.target.value })}
              />
              <button 
                onClick={handleNext}
                disabled={!input.syllabus}
                className="w-full py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 font-bold text-xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20"
              >
                Continuar
                <ChevronRight className="w-6 h-6" />
              </button>
            </motion.div>
          )}

          {/* Step 2: Methodology */}
          {wizardStep === "methodology" && (
            <motion.div 
              key="methodology"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white">¿Cómo te gusta trabajar en clase?</h2>
                <p className="text-slate-400 text-lg">Paso 2: Contame si preferís trabajos grupales, clases magistrales, debates o experimentos prácticos.</p>
              </div>
              <textarea 
                className="w-full h-48 p-6 rounded-2xl bg-slate-900 border border-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-lg text-slate-200"
                value={input.methodology}
                onChange={(e) => setInput({ ...input, methodology: e.target.value })}
              />
              <div className="flex gap-4">
                <button onClick={handleBack} className="flex-1 py-5 rounded-2xl bg-slate-900 border border-slate-800 font-bold text-xl hover:bg-slate-800 transition-all">Atrás</button>
                <button onClick={handleNext} className="flex-[2] py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 font-bold text-xl transition-all shadow-xl shadow-blue-900/20">Siguiente</button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Profile */}
          {wizardStep === "profile" && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white">¿Cuál es tu perfil docente?</h2>
                <p className="text-slate-400 text-lg">Paso 3: ¿Sos un docente exigente, cercano a los alumnos, o te gusta usar mucho la tecnología? Esto define el "alma" de tu plan.</p>
              </div>
              <textarea 
                className="w-full h-48 p-6 rounded-2xl bg-slate-900 border border-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-lg text-slate-200"
                value={input.teacherProfile}
                onChange={(e) => setInput({ ...input, teacherProfile: e.target.value })}
              />
              <div className="flex gap-4">
                <button onClick={handleBack} className="flex-1 py-5 rounded-2xl bg-slate-900 border border-slate-800 font-bold text-xl hover:bg-slate-800 transition-all">Atrás</button>
                <button 
                  onClick={handleGenerateOutline} 
                  disabled={status === "generating"}
                  className="flex-[2] py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 font-bold text-xl transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3"
                >
                  {status === "generating" ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" />}
                  Armar Cronograma
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Outline (Schedule) */}
          {wizardStep === "outline" && plan && (
            <motion.div 
              key="outline"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-10"
            >
              <div className="text-center space-y-3">
                <h2 className="text-4xl font-bold text-white">Tu Cronograma Anual</h2>
                <p className="text-slate-400 text-lg">Basado exclusivamente en tu programa. ¿Qué te parece?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plan.trimesters.map((t) => (
                  <div key={t.id} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-6">
                    <h3 className="text-xl font-bold text-blue-400 border-b border-slate-800 pb-4">{t.title}</h3>
                    {t.blocks.map(b => (
                      <div key={b.id} className="space-y-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{b.title}</p>
                        <ul className="space-y-2">
                          {b.classes.map(c => (
                            <li key={c.id} className="text-sm text-slate-300 flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-700 mt-1.5 shrink-0" />
                              {c.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="max-w-md mx-auto">
                <button 
                  onClick={handleNext}
                  className="w-full py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 font-bold text-xl transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3"
                >
                  Todo bien, agregar bibliografía
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Bibliography */}
          {wizardStep === "bibliography" && (
            <motion.div 
              key="bibliography"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white">Bibliografía de la materia</h2>
                <p className="text-slate-400 text-lg">Pega los libros o autores. Si no tenés, la IA buscará contenido oficial (.edu.ar).</p>
              </div>
              <textarea 
                className="w-full h-64 p-6 rounded-2xl bg-slate-900 border border-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-lg text-slate-200"
                placeholder="Ej: Campbell, N. (2017). Biología. Editorial Médica Panamericana."
                value={input.bibliography}
                onChange={(e) => setInput({ ...input, bibliography: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Nivel de complejidad</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['muy fácil', 'fácil', 'normal', 'media'] as Complexity[]).map(c => (
                      <button 
                        key={c}
                        onClick={() => setInput({...input, complexity: c})}
                        className={cn(
                          "py-3 rounded-xl border text-sm font-bold capitalize transition-all",
                          input.complexity === c 
                            ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20" 
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button 
                onClick={handleNext}
                className="w-full py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 font-bold text-xl transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3"
              >
                Comenzar a generar clases
                <ChevronRight className="w-6 h-6" />
              </button>
            </motion.div>
          )}

          {/* Step 6: Classes Generation & View */}
          {wizardStep === "classes" && plan && (
            <motion.div 
              key="classes"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-white">Planificación Detallada</h2>
                <button onClick={downloadHTML} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all border border-slate-700">
                  <Download className="w-5 h-5" />
                  Descargar Plan
                </button>
              </div>

              <div className="space-y-16">
                {plan.trimesters.map(t => (
                  <div key={t.id} className="space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="h-px flex-1 bg-slate-800" />
                      <h3 className="text-2xl font-bold text-blue-400 px-4">{t.title}</h3>
                      <div className="h-px flex-1 bg-slate-800" />
                    </div>

                    <div className="grid grid-cols-1 gap-12">
                      {t.blocks.map(b => (
                        <div key={b.id} className="space-y-6">
                          <h4 className="text-lg font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3">
                            <LayoutGrid className="w-5 h-5" />
                            {b.title}
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {b.classes.map(c => (
                              <div key={c.id} className="group bg-slate-900 border border-slate-800 rounded-3xl p-8 hover:border-blue-500/50 transition-all shadow-sm">
                                <div className="flex items-start justify-between gap-4 mb-6">
                                  <h5 className="text-xl font-bold text-white leading-tight">{c.title}</h5>
                                  {!c.isGenerated ? (
                                    <button 
                                      onClick={() => handleGenerateClass(t.id, b.id, c.id)}
                                      disabled={status === "generating"}
                                      className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-2xl shadow-lg shadow-blue-900/20 transition-all"
                                      title="Generar contenido"
                                    >
                                      {status === "generating" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={() => {
                                        setSelectedClass({tId: t.id, bId: b.id, cId: c.id});
                                        setShowSlides(true);
                                      }}
                                      className="shrink-0 bg-slate-800 hover:bg-slate-700 text-blue-400 p-3 rounded-2xl transition-all"
                                      title="Modo Presentación"
                                    >
                                      <Presentation className="w-5 h-5" />
                                    </button>
                                  )}
                                </div>

                                {c.isGenerated ? (
                                  <div className="space-y-6">
                                    <div className="space-y-2">
                                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Objetivos</p>
                                      <ul className="text-sm text-slate-400 space-y-1">
                                        {c.objectives.map((o, i) => <li key={i} className="flex gap-2"><span>•</span>{o}</li>)}
                                      </ul>
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contenido</p>
                                      <p className="text-sm text-slate-300 line-clamp-3">{c.contents[0]}</p>
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actividad</p>
                                      <p className="text-sm text-slate-300 line-clamp-3">{c.activity}</p>
                                    </div>
                                    <button 
                                      onClick={() => handleGenerateClass(t.id, b.id, c.id)}
                                      className="text-xs font-bold text-slate-500 hover:text-blue-400 flex items-center gap-2 transition-colors"
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                      Reelaborar clase
                                    </button>
                                  </div>
                                ) : (
                                  <div className="py-12 text-center space-y-2">
                                    <p className="text-slate-600 italic text-sm">Contenido no generado aún.</p>
                                    <p className="text-[10px] text-slate-700 uppercase font-bold">Haz clic en el botón +</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Slide Overlay (Presentation Mode) */}
      <AnimatePresence>
        {showSlides && currentClassData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col"
          >
            <div className="h-20 px-8 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-4">
                <Presentation className="text-blue-500 w-6 h-6" />
                <h2 className="text-xl font-bold text-white">{currentClassData.title}</h2>
              </div>
              <button 
                onClick={() => setShowSlides(false)}
                className="p-3 hover:bg-white/10 rounded-full transition-all"
              >
                <X className="text-white w-8 h-8" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-12 md:p-24">
              <div className="max-w-4xl mx-auto space-y-24">
                {/* Slide 1: Title & Objectives */}
                <section className="min-h-[60vh] flex flex-col justify-center space-y-12">
                  <h3 className="text-6xl md:text-8xl font-black text-white leading-tight">
                    {currentClassData.title}
                  </h3>
                  <div className="space-y-6">
                    <p className="text-2xl font-bold text-blue-500 uppercase tracking-widest">Objetivos de hoy</p>
                    <ul className="text-3xl md:text-4xl text-slate-300 space-y-4">
                      {currentClassData.objectives.map((o, i) => (
                        <li key={i} className="flex gap-6">
                          <span className="text-blue-600 font-black">{i + 1}.</span>
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                {/* Slides: Visual Presentation */}
                {currentClassData.slides && currentClassData.slides.length > 0 ? (
                  currentClassData.slides.map((slide, i) => (
                    <section key={`slide-${i}`} className="min-h-[60vh] flex flex-col justify-center space-y-12">
                      <h3 className="text-4xl md:text-6xl font-bold text-blue-400 leading-tight">
                        {slide.title}
                      </h3>
                      <div className="bg-white/5 border border-white/10 p-10 md:p-16 rounded-4xl shadow-xl">
                        <ul className="text-2xl md:text-4xl text-slate-200 space-y-8 list-none">
                          {slide.bulletPoints.map((bp, j) => (
                            <li key={j} className="flex gap-6 items-start">
                              <span className="text-blue-500 mt-2">✦</span>
                              <span className="leading-relaxed">{bp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </section>
                  ))
                ) : (
                  <section className="min-h-[60vh] flex flex-col justify-center space-y-12">
                    <p className="text-2xl font-bold text-blue-500 uppercase tracking-widest">Desarrollo de la clase</p>
                    <div className="grid grid-cols-1 gap-8">
                      {currentClassData.contents.map((c, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 p-8 md:p-12 rounded-4xl">
                          <p className="text-xl md:text-2xl text-slate-200 leading-relaxed">{c}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Slide 3: Activity */}
                <section className="min-h-[60vh] flex flex-col justify-center space-y-12">
                  <div className="bg-blue-600 p-12 md:p-20 rounded-[4rem] shadow-2xl shadow-blue-900/40">
                    <p className="text-2xl font-bold text-white/70 uppercase tracking-widest mb-8">Actividad del día</p>
                    <p className="text-3xl md:text-4xl font-bold text-white leading-tight">
                      {currentClassData.activity}
                    </p>
                  </div>
                </section>

                {/* Slide 4: Evaluation */}
                <section className="min-h-[60vh] flex flex-col justify-center space-y-12">
                  <p className="text-2xl font-bold text-blue-500 uppercase tracking-widest">¿Cómo nos evaluamos?</p>
                  <p className="text-3xl md:text-4xl text-slate-300 leading-relaxed italic">
                    "{currentClassData.evaluation}"
                  </p>
                </section>
              </div>
            </div>

            <div className="h-20 px-8 flex items-center justify-center border-t border-white/10 text-slate-500 text-sm font-bold uppercase tracking-widest">
              Usa el scroll para navegar • Modo Proyector Activado
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Overlay */}
      {status === "generating" && (
        <div className="fixed bottom-8 right-8 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-blue-600 text-white p-6 rounded-3xl shadow-2xl flex items-center gap-4 border border-blue-400"
          >
            <Loader2 className="w-6 h-6 animate-spin" />
            <div>
              <p className="font-bold text-sm">Trabajando...</p>
              <p className="text-xs text-blue-200">{progressMessage}</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-8 left-8 z-50">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-600 text-white p-6 rounded-3xl shadow-2xl flex items-center gap-4 border border-red-400"
          >
            <AlertCircle className="w-6 h-6" />
            <div>
              <p className="font-bold text-sm">¡Ups! Algo falló</p>
              <p className="text-xs text-red-200">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-4 p-1 hover:bg-white/10 rounded-full"><X className="w-4 h-4" /></button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
