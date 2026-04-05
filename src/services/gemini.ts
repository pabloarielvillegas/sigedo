import { GoogleGenAI, Type } from "@google/genai";
import { AnnualPlan, PlanningInput, ClassPlan } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const modelName = "gemini-3.1-pro-preview";

export async function generateOutline(input: PlanningInput): Promise<AnnualPlan> {
  const response = await ai.models.generateContent({
    model: modelName,
    contents: `Como experto pedagogo, crea un cronograma anual de 48 clases (3 trimestres, 2 bloques por trimestre, 8 clases por bloque) basado exclusivamente en el siguiente programa de materia.
    
    PROGRAMA:
    ${input.syllabus}
    
    METODOLOGÍA DESEADA:
    ${input.methodology}
    
    PERFIL DEL DOCENTE:
    ${input.teacherProfile}
    
    Responde en formato JSON con la estructura de títulos de clases y temas asignados a cada una.
    Asegura una progresión lógica basada EXCLUSIVAMENTE en el programa.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          trimesters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                blocks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      classes: { 
                        type: Type.ARRAY, 
                        items: { 
                          type: Type.OBJECT,
                          properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING }
                          },
                          required: ["id", "title"]
                        },
                        minItems: 8,
                        maxItems: 8
                      }
                    },
                    required: ["id", "title", "classes"]
                  },
                  minItems: 2,
                  maxItems: 2
                }
              },
              required: ["id", "title", "blocks"]
            },
            minItems: 3,
            maxItems: 3
          }
        },
        required: ["trimesters"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function generateClassDetail(
  input: PlanningInput,
  classTitle: string,
  trimesterTitle: string,
  blockTitle: string
): Promise<ClassPlan> {
  // Check if bibliography is sufficient
  let finalBibliography = input.bibliography;
  
  if (input.bibliography.trim().length < 10) {
    const searchResponse = await ai.models.generateContent({
      model: modelName,
      contents: `Busca contenido básico para el tema "${classTitle}" en sitios .edu.ar o .gob.ar. 
      Proporciona las fuentes encontradas en formato APA.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    finalBibliography += "\n" + (searchResponse.text || "");
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: `Desarrolla el CONTENIDO LITERAL Y EXACTO que se va a dictar en la clase "${classTitle}" del bloque "${blockTitle}" en el "${trimesterTitle}".
    
    Complejidad: ${input.complexity}
    Metodología: ${input.methodology}
    Perfil del Docente: ${input.teacherProfile}
    Bibliografía disponible: ${finalBibliography}
    
    IMPORTANTE: No generes "consejos para dar la clase" ni un "plan de clase" abstracto. Genera el MATERIAL REAL que el docente va a explicar a los alumnos, con la explicación completa del tema.
    
    Incluye: 
    - Objetivos (mínimo 2)
    - Contenidos (El guion completo del profesor, el texto real y extenso de la explicación de la clase. Cada elemento del array debe ser un párrafo o sección de la explicación)
    - Slides (Diapositivas visuales para proyectar a los alumnos. Deben ser muy concisas, con un título corto y viñetas breves. NO pongas el guion del profesor aquí, solo los puntos clave visuales)
    - Actividad (El enunciado exacto y literal de la actividad que harán los alumnos)
    - Evaluación (El criterio o consigna exacta de evaluación)
    - Bibliografía (usando fuentes reales y APA).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
          contents: { type: Type.ARRAY, items: { type: Type.STRING } },
          slides: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["title", "bulletPoints"]
            }
          },
          activity: { type: Type.STRING },
          evaluation: { type: Type.STRING },
          bibliography: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["objectives", "contents", "slides", "activity", "evaluation", "bibliography"]
      }
    }
  });

  const details = JSON.parse(response.text || "{}");
  return {
    id: Math.random().toString(36).substr(2, 9),
    title: classTitle,
    isGenerated: true,
    ...details
  };
}
