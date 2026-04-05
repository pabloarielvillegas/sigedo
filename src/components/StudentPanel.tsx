import React, { useState, useEffect } from 'react';
import { Curso, AnnualPlan, UserProfile } from '../types';
import { Book, GraduationCap, Lock, Unlock, ChevronRight } from 'lucide-react';

export default function StudentPanel({ userProfile }: { userProfile: UserProfile }) {
  const [cursos, setCursos] = useState<(Curso & { materiaName?: string, plan?: AnnualPlan })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCurso, setSelectedCurso] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const res = await fetch(`/api/student/dashboard?studentId=${userProfile.uid}`);
        if (res.ok) {
          const data = await res.json();
          setCursos(data);
        }
      } catch (error) {
        console.error("Error fetching student data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [userProfile.uid]);

  if (loading) return <div className="text-center py-12 text-slate-400">Cargando tus clases...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
        <div className="bg-emerald-600 p-3 rounded-xl shadow-lg shadow-emerald-900/20">
          <GraduationCap className="text-white w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Mis Clases</h2>
          <p className="text-slate-400">Aquí verás el contenido habilitado por tus profesores.</p>
        </div>
      </div>

      {cursos.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800">
          <p className="text-slate-400">No estás inscrito en ningún curso todavía.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {cursos.map(curso => (
            <div key={curso.id} className="bg-[#1e293b] rounded-2xl border border-slate-800 overflow-hidden">
              <div 
                className="p-6 cursor-pointer hover:bg-slate-800/50 transition-colors flex items-center justify-between"
                onClick={() => setSelectedCurso(selectedCurso === curso.id ? null : curso.id)}
              >
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Book className="w-5 h-5 text-emerald-500" /> {curso.materiaName}
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">Curso: {curso.name}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                    {curso.visibleClasses} clases habilitadas
                  </span>
                  <ChevronRight className={`w-5 h-5 text-slate-500 transition-transform ${selectedCurso === curso.id ? 'rotate-90' : ''}`} />
                </div>
              </div>

              {selectedCurso === curso.id && (
                <div className="p-6 border-t border-slate-800 bg-slate-900/30">
                  {!curso.plan ? (
                    <p className="text-slate-500 italic">El profesor aún no ha publicado el cronograma.</p>
                  ) : (
                    <div className="space-y-6">
                      {curso.plan.trimesters.map((trimestre, tIdx) => (
                        <div key={trimestre.id} className="space-y-4">
                          <h4 className="font-bold text-slate-300 border-b border-slate-800 pb-2">{trimestre.title}</h4>
                          <div className="grid gap-4">
                            {trimestre.blocks.map((bloque, bIdx) => (
                              <div key={bloque.id} className="pl-4 border-l-2 border-slate-800 space-y-3">
                                <h5 className="text-sm font-bold text-slate-400">{bloque.title}</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {bloque.classes.map((clase, cIdx) => {
                                    // Calculate absolute class number to check against visibleClasses
                                    let absoluteClassIndex = 0;
                                    for (let i = 0; i <= tIdx; i++) {
                                      const t = curso.plan!.trimesters[i];
                                      for (let j = 0; j < (i === tIdx ? bIdx : t.blocks.length); j++) {
                                        absoluteClassIndex += t.blocks[j].classes.length;
                                      }
                                    }
                                    absoluteClassIndex += cIdx;
                                    
                                    const isVisible = absoluteClassIndex < curso.visibleClasses;

                                    return (
                                      <div 
                                        key={clase.id} 
                                        className={`p-4 rounded-xl border ${isVisible ? 'bg-slate-800 border-slate-700' : 'bg-slate-900/50 border-slate-800/50 opacity-60'}`}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div>
                                            <span className="text-xs font-bold text-slate-500 block mb-1">Clase {absoluteClassIndex + 1}</span>
                                            <h6 className={`font-bold ${isVisible ? 'text-white' : 'text-slate-500'}`}>{clase.title}</h6>
                                          </div>
                                          {isVisible ? <Unlock className="w-4 h-4 text-emerald-500 shrink-0" /> : <Lock className="w-4 h-4 text-slate-600 shrink-0" />}
                                        </div>
                                        {isVisible && clase.isGenerated && (
                                          <div className="mt-3 text-sm text-slate-400 line-clamp-2">
                                            {clase.contents[0]}...
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
