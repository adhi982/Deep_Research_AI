import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabaseClient, ResearchHistory, ResearchQuestion, ResearchProgress, ResearchResult } from './supabase';
import { submitFeedback as submitResearchFeedback } from '../utils/researchService';

interface ResearchContextType {
  currentResearch: ResearchHistory | null;
  questions: ResearchQuestion[];
  progress: ResearchProgress[];
  result: ResearchResult | null;
  setCurrentResearch: (research: ResearchHistory | null) => void;
  submitQuestionAnswer: (questionId: string, answer: string) => Promise<void>;
  submitFeedback: (rating: number, comment?: string) => Promise<void>;
}

const ResearchContext = createContext<ResearchContextType | undefined>(undefined);

export const ResearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentResearch, setCurrentResearch] = useState<ResearchHistory | null>(null);
  const [questions, setQuestions] = useState<ResearchQuestion[]>([]);
  const [progress, setProgress] = useState<ResearchProgress[]>([]);
  const [result, setResult] = useState<ResearchResult | null>(null);

  // Subscribe to progress updates
  useEffect(() => {
    if (!currentResearch?.research_id) return;

    const progressSubscription = supabaseClient.subscribeToResearchProgress(
      currentResearch.research_id,
      (payload) => {
        if (payload.new) {
          setProgress((prev) => [payload.new, ...prev]);
        }
      }
    );

    return () => {
      progressSubscription.unsubscribe();
    };
  }, [currentResearch?.research_id]);

  // Subscribe to new questions
  useEffect(() => {
    if (!currentResearch?.research_id) return;

    const questionsSubscription = supabaseClient.subscribeToResearchQuestions(
      currentResearch.research_id,
      (payload) => {
        if (payload.new) {
          setQuestions((prev) => [...prev, payload.new]);
        }
      }
    );

    return () => {
      questionsSubscription.unsubscribe();
    };
  }, [currentResearch?.research_id]);

  // Fetch initial data when research changes
  useEffect(() => {
    if (!currentResearch?.research_id) return;

    const fetchData = async () => {
      // Fetch questions
      const { data: questionsData } = await supabaseClient.getUnansweredQuestions(
        currentResearch.research_id
      );
      if (questionsData) setQuestions(questionsData);

      // Fetch progress
      const { data: progressData } = await supabaseClient.getResearchProgress(
        currentResearch.research_id
      );
      if (progressData) setProgress(progressData);

      // Fetch result
      const { data: resultData } = await supabaseClient.getResearchResult(
        currentResearch.research_id
      );
      if (resultData) setResult(resultData);
    };

    fetchData();
  }, [currentResearch?.research_id]);

  const submitQuestionAnswer = async (questionId: string, answer: string) => {
    if (!currentResearch?.research_id) return;

    await supabaseClient.submitAnswer(questionId, answer);
    setQuestions((prev) =>
      prev.map((q) =>
        q.question_id === questionId ? { ...q, answer, answered: true } : q
      )
    );
  };

  const submitFeedback = async (rating: number, comment?: string) => {
    if (!currentResearch?.research_id) {
      console.error('Cannot submit feedback: No current research selected');
      return;
    }

    console.log(`ResearchContext: Submitting feedback for research ${currentResearch.research_id}`);
    try {
      await supabaseClient.submitFeedback({
        research_id: currentResearch.research_id,
        user_id: currentResearch.user_id,
        rating,
        comment,
      });
      console.log('Feedback submission was successful');
    } catch (error) {
      console.error('Error in ResearchContext.submitFeedback:', error);
    }
  };

  return (
    <ResearchContext.Provider
      value={{
        currentResearch,
        questions,
        progress,
        result,
        setCurrentResearch,
        submitQuestionAnswer,
        submitFeedback,
      }}
    >
      {children}
    </ResearchContext.Provider>
  );
};

export const useResearch = () => {
  const context = useContext(ResearchContext);
  if (context === undefined) {
    throw new Error('useResearch must be used within a ResearchProvider');
  }
  return context;
}; 