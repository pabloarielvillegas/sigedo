import React, { useState, useEffect } from 'react';
import { Materia, Curso, UserProfile } from '../types';
import { Book, Users, Plus, Edit2, UserPlus, X } from 'lucide-react';

export default function TeacherPanel({ userProfile }: { userProfile: UserProfile }) {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all students for assignment
        const studentsRes = await fetch('/api/users/students');
        const studentsData = await studentsRes.json();
        setAllStudents(studentsData);

        // Fetch materias for this teacher
        const materiasRes = await fetch(`/api/materias?teacherId=${userProfile.uid}`);
        const materiasData = await materiasRes.json();
        setMaterias(materiasData);

        // Fetch cursos for these materias
        if (materiasData.length > 0) {
          const materiaIds = materiasData.map((m: Materia) => m.id).join(',');
          const cursosRes = await fetch(`/api/cursos?materiaIds=${materiaIds}`);
          const cursosData = await cursosRes.json();
          setCursos(cursosData);
        }
      } catch (error) {
        console.error("Error fetching teacher data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userProfile.uid]);

  const handleCreateMateria = async () => {
    const name = prompt("Nombre de la nueva materia:");
    if (!name) return;
    const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    const newMateria: Materia = { id: newId, name, teacherId: userProfile.uid };
    try {
      const res = await fetch('/api/materias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMateria)
      });
      if (res.ok) {
        setMaterias([...materias, newMateria]);
      } else {
        alert("Error al crear materia");
      }
    } catch (error) {
      console.error("Error creating materia:", error);
      alert("Error al crear materia");
    }
  };

  const handleCreateCurso = async (materiaId: string) => {
    const name = prompt("Nombre del nuevo curso (ej: 5° I Sección):");
    if (!name) return;
    const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    const newCurso: Curso = { id: newId, name, materiaId, studentIds: [], visibleClasses: 0 };
    try {
      const res = await fetch('/api/cursos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCurso)
      });
      if (res.ok) {
        setCursos([...cursos, newCurso]);
      } else {
        alert("Error al crear curso");
      }
    } catch (error) {
      console.error("Error creating curso:", error);
      alert("Error al crear curso");
    }
  };

  const handleUpdateVisibleClasses = async (cursoId: string, visibleClasses: number) => {
    try {
      const res = await fetch(`/api/cursos/${cursoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibleClasses })
      });
      if (res.ok) {
        setCursos(cursos.map(c => c.id === cursoId ? { ...c, visibleClasses } : c));
      } else {
        alert("Error al actualizar clases visibles");
      }
    } catch (error) {
      console.error("Error updating visible classes:", error);
      alert("Error al actualizar clases visibles");
    }
  };

  const handleToggleStudent = async (cursoId: string, studentId: string) => {
    const curso = cursos.find(c => c.id === cursoId);
    if (!curso) return;

    const isEnrolled = curso.studentIds.includes(studentId);
    const newStudentIds = isEnrolled 
      ? curso.studentIds.filter(id => id !== studentId)
      : [...curso.studentIds, studentId];

    try {
      const res = await fetch(`/api/cursos/${cursoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: newStudentIds })
      });
      if (res.ok) {
        setCursos(cursos.map(c => c.id === cursoId ? { ...c, studentIds: newStudentIds } : c));
      } else {
        alert("Error al actualizar alumnos");
      }
    } catch (error) {
      console.error("Error updating students:", error);
      alert("Error al actualizar alumnos");
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Cargando tus materias...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-900/20">
            <Book className="text-white w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Mis Materias</h2>
            <p className="text-slate-400">Gestiona tus materias, cursos y visibilidad de clases.</p>
          </div>
        </div>
        <button 
          onClick={handleCreateMateria}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nueva Materia
        </button>
      </div>

      {materias.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800">
          <p className="text-slate-400 mb-4">Aún no tienes materias asignadas.</p>
          <button onClick={handleCreateMateria} className="text-blue-400 font-bold hover:text-blue-300">Crear tu primera materia</button>
        </div>
      ) : (
        <div className="grid gap-6">
          {materias.map(materia => (
            <div key={materia.id} className="bg-[#1e293b] rounded-2xl border border-slate-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Book className="w-5 h-5 text-blue-500" /> {materia.name}
                </h3>
                <button 
                  onClick={() => handleCreateCurso(materia.id)}
                  className="text-sm font-bold text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Añadir Curso
                </button>
              </div>

              <div className="space-y-4">
                {cursos.filter(c => c.materiaId === materia.id).length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No hay cursos en esta materia.</p>
                ) : (
                  cursos.filter(c => c.materiaId === materia.id).map(curso => (
                    <div key={curso.id} className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5 text-slate-400" />
                          <div>
                            <p className="font-bold text-white">{curso.name}</p>
                            <p className="text-xs text-slate-500">{curso.studentIds.length} alumnos inscritos</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-end">
                            <label className="text-xs font-bold text-slate-400 uppercase mb-1">Clases Visibles</label>
                            <input 
                              type="number" 
                              min="0"
                              value={curso.visibleClasses}
                              onChange={(e) => handleUpdateVisibleClasses(curso.id, parseInt(e.target.value) || 0)}
                              className="w-20 bg-slate-800 border border-slate-700 text-white text-center rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Student Management */}
                      <div className="pt-4 border-t border-slate-800/50">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Gestionar Alumnos</label>
                        <div className="flex flex-wrap gap-2">
                          {allStudents.map(student => {
                            const isEnrolled = curso.studentIds.includes(student.uid);
                            return (
                              <button
                                key={student.uid}
                                onClick={() => handleToggleStudent(curso.id, student.uid)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                                  isEnrolled 
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30' 
                                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white'
                                }`}
                              >
                                {student.displayName}
                                {isEnrolled ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                              </button>
                            );
                          })}
                          {allStudents.length === 0 && (
                            <span className="text-xs text-slate-500 italic">No hay alumnos registrados en el sistema.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
