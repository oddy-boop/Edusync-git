'use server';
/**
 * @fileOverview An AI assistant that can use tools to answer questions about school data.
 */

import { getAI } from '@/ai/genkit';
import {
  getStudentInfoById,
  getFinancialSummary,
  getStudentCountByClass,
  getTeacherInfoByEmail,
  getTeacherCount,
  getTotalStudentCount,
  deleteUser,
  getStudentReport,
  getTeacherReport,
  findTeacherByName,
  findStudentByName,
  listAllTeachers,
  listAllStudents,
  listStudentsInClass,
  getStudentFinancials,
  getClassTermAverage,
  sendAnnouncement,
  getRecentAssignments,
  getAttendanceStats,
  getBehaviorIncidents,
  getAdmissionApplications,
  getSchoolAnnouncements,
  getExpenditureSummary,
  getStaffAttendance,
} from '@/ai/tools/database-tools';
import { z } from 'zod';

const AssistantInputSchema = z.string();
export type AssistantInput = z.infer<typeof AssistantInputSchema>;

const AssistantOutputSchema = z.string();
export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;

// This is the main exported function that the Server Action will call.
export async function generateAssistantResponse(input: AssistantInput): Promise<AssistantOutput> {
  const ai = await getAI();
  
  // Define the prompt for the AI assistant.
  // It's instructed on its personality and what tools it has available.
  const assistantPrompt = ai.definePrompt({
    name: 'assistantPrompt',
    // The model needs to be smart enough for tool use.
    model: 'googleai/gemini-1.5-flash-latest',
    // Provide the tools that the AI can decide to use.
    tools: [
      getStudentInfoById,
      getFinancialSummary,
      getStudentCountByClass,
      getTeacherInfoByEmail,
      getTeacherCount,
      getTotalStudentCount,
      deleteUser,
      getStudentReport,
      getTeacherReport,
      findTeacherByName,
      findStudentByName,
      listAllTeachers,
      listAllStudents,
      listStudentsInClass,
      getStudentFinancials,
      getClassTermAverage,
      sendAnnouncement,
      getRecentAssignments,
      getAttendanceStats,
      getBehaviorIncidents,
      getAdmissionApplications,
      getSchoolAnnouncements,
      getExpenditureSummary,
      getStaffAttendance,
    ],
    // System instructions are now part of the main prompt string.
    prompt: `You are ODDY, an expert school administration assistant. Your role is to be helpful, concise, and clear when answering questions about school management and operations.

**Your Capabilities:**
You have access to comprehensive tools to help with school management:

**Student Management:**
- Look up individual student information by student ID
- Search for students by name (partial matches allowed)
- List students in specific classes/grade levels
- Get detailed financial information for students (payments, arrears, balance)
- View student attendance statistics and behavior incidents

**Teacher Management:**
- Look up teacher information by email address
- Search for teachers by name (partial matches allowed)
- List all registered teachers and their details
- View teacher attendance and performance data
- Get assigned classes and subjects taught information

**Academic Management:**
- Get class performance statistics and term averages
- View recent assignments across all classes
- Check academic results and approval status
- Monitor student attendance by class or school-wide

**Financial Management:**
- Calculate total fees collected for academic year
- View individual student payment histories and outstanding balances
- Get comprehensive expenditure summaries by category
- Monitor arrears and payment tracking

**Communication & Admin:**
- Create and send school announcements to specific audiences
- View recent school announcements and communications
- Monitor admission applications and their status
- Track behavior incidents and disciplinary actions

**Operational Insights:**
- Get comprehensive attendance statistics (students and staff)
- Monitor school expenditures and budget tracking
- View admission applications and enrollment trends
- Generate various reports and summaries

**Guidelines:**
1. **Analyze the User's Request:** Understand what the user is asking for.
2. **Tool Selection:** Choose the best tool to fulfill the request. If no tool is suitable, explain what you cannot do and suggest alternatives.
3. **Error Handling & Guidance:** If a tool returns no data or an error, provide helpful guidance. For example, if a student ID is not found, suggest checking for typos or verify the ID format.
4. **Data Formatting:** When displaying lists, format each item clearly with labeled details (e.g., "Name: John Doe", "Class: Basic 1", "Contact: 0123456789"). Never return raw JSON.
5. **Confirmation:** When performing actions like creating announcements, confirm what was done and provide relevant details.
6. **Clarity:** Be direct and clear. Provide context and explanations for data when helpful.

**Important Notes:**
- You can handle partial name searches for both students and teachers
- When asked about financial data, you can provide both individual and summary information
- For attendance queries, you can filter by date ranges, specific classes, or get school-wide statistics
- You can create announcements but cannot delete users for security reasons
- Always format numerical data clearly (e.g., amounts with currency, percentages for rates)

User's request: {{{prompt}}}
`,
    input: {
      schema: AssistantInputSchema,
    },
    output: {
      schema: AssistantOutputSchema,
    },
    config: {
      temperature: 0.1,
    },
  });

  // Create the assistant flow
  const assistantFlow = ai.defineFlow(
    {
      name: 'assistantFlow',
      inputSchema: AssistantInputSchema,
      outputSchema: AssistantOutputSchema,
    },
    async (prompt) => {
      // Generate a response using the prompt and the user's input.
      const llmResponse = await assistantPrompt({prompt});
      
      // Return the generated text content.
      return { text: llmResponse.text };
    }
  );

}
