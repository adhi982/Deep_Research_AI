import { supabase } from "../utils/supabase";
import { toast } from "sonner-native";
import sendResearchQuery from "./services/sendResearchQuery";

// Login user with email and password
export const loginUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

// Sign up a new user with email and password
export const signUpUser = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  // Optionally update user profile
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", data.user?.id);
  if (updateError) throw updateError;
  return data;
};

// Update user profile information
export const updateUserProfile = async (userId: string, profileData: { full_name?: string, bio?: string, profile_image?: string }) => {
  const { data, error } = await supabase
    .from("profiles")
    .update(profileData)
    .eq("id", userId);
  if (error) throw error;
  return data;
};

// Fetch a specific research report by its ID
export const fetchResearchReport = async (researchId: string) => {
  const { data, error } = await supabase
    .from("research_reports")
    .select("*")
    .eq("id", researchId)
    .single();
  if (error) throw error;
  return data;
};

// Submit research feedback
export const submitResearchFeedback = async (researchId: string, rating: number, comment: string) => {
  const { data, error } = await supabase
    .from("research_feedback")
    .insert([{ research_id: researchId, rating, comment }]);
  if (error) throw error;
  return data;
};

// Fetch research topics associated with a report
export const fetchResearchTopics = async (researchId: string) => {
  const { data, error } = await supabase
    .from("research_topics")
    .select("*")
    .eq("research_id", researchId)
    .order("relevance", { ascending: false });
  if (error) throw error;
  return data;
};

export { sendResearchQuery };

export default {
  loginUser,
  signUpUser,
  updateUserProfile,
  fetchResearchReport,
  submitResearchFeedback,
  fetchResearchTopics,
  sendResearchQuery
};