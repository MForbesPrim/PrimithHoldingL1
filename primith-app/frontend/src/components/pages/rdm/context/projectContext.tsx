import React, { createContext, useState, useContext, useEffect } from 'react';
import { Project } from '@/types/projects';
import { ProjectService } from '@/services/projectService';

interface ProjectContextType {
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  currentProject: Project | null;
  loadingProject: boolean;
}

const ProjectContext = createContext<ProjectContextType>({
  selectedProjectId: null,
  setSelectedProjectId: () => {},
  currentProject: null,
  loadingProject: false,
});

export const useProject = () => useContext(ProjectContext);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    localStorage.getItem('selectedProjectId')
  );
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);

  const projectService = new ProjectService();

  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem('selectedProjectId', selectedProjectId);
      loadProject(selectedProjectId);
    } else {
      localStorage.removeItem('selectedProjectId');
      setCurrentProject(null);
    }
  }, [selectedProjectId]);

  const loadProject = async (projectId: string) => {
    try {
      setLoadingProject(true);
      const project = await projectService.getProjectById(projectId);
      setCurrentProject(project);
    } catch (error) {
      console.error("Failed to load project:", error);
      if (error instanceof Error && error.message === 'Authentication required. Please login again.') {
        setSelectedProjectId(null); // Clear selectedProjectId to stop useEffect
        window.location.href = '/login'; // Redirect to login page
      } else {
        setCurrentProject(null); // Handle other errors as before
      }
    } finally {
      setLoadingProject(false);
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        selectedProjectId,
        setSelectedProjectId,
        currentProject,
        loadingProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};