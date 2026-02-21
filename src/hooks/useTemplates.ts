import { useState, useCallback } from 'react';

export interface TaskTemplate {
  id: string;
  name: string;
  category?: string;
  plannedDuration?: number;
  startHour?: number;
}

function loadTemplates(): TaskTemplate[] {
  try {
    const s = localStorage.getItem('app_templates');
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

export function useTemplates() {
  const [templates, setTemplates] = useState<TaskTemplate[]>(loadTemplates);

  const save = (t: TaskTemplate[]) => {
    setTemplates(t);
    localStorage.setItem('app_templates', JSON.stringify(t));
  };

  const addTemplate = useCallback((template: Omit<TaskTemplate, 'id'>) => {
    const newTpl = { ...template, id: crypto.randomUUID() };
    save([...templates, newTpl]);
    return newTpl;
  }, [templates]);

  const deleteTemplate = useCallback((id: string) => {
    save(templates.filter(t => t.id !== id));
  }, [templates]);

  return { templates, addTemplate, deleteTemplate };
}
