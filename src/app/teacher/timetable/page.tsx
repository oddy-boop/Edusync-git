
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarDays } from "lucide-react";

interface TimetableEntry {
  time: string;
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
}

// Sample data - in a real application, this would come from a database
const sampleTimetableData: TimetableEntry[] = [
  { time: "08:00 - 08:40", monday: "Mathematics (JHS 1A)", tuesday: "English (Basic 6B)", wednesday: "Assembly", thursday: "Mathematics (JHS 1A)", friday: "Science (Basic 6B)" },
  { time: "08:40 - 09:20", monday: "Science (Basic 6B)", tuesday: "Mathematics (JHS 1A)", wednesday: "Social Studies (JHS 1A)", thursday: "Science (Basic 6B)", friday: "English (Basic 6B)" },
  { time: "09:20 - 10:00", monday: "English (Basic 6B)", tuesday: "Free Period", wednesday: "RME (Basic 6B)", thursday: "English (Basic 6B)", friday: "Mathematics (JHS 1A)" },
  { time: "10:00 - 10:30", monday: "Break", tuesday: "Break", wednesday: "Break", thursday: "Break", friday: "Break" },
  { time: "10:30 - 11:10", monday: "Social Studies (JHS 1A)", tuesday: "Computing (Basic 6B)", wednesday: "Mathematics (JHS 1A)", thursday: "Social Studies (JHS 1A)", friday: "PE (Basic 6B)" },
  { time: "11:10 - 11:50", monday: "RME (Basic 6B)", tuesday: "Ghanaian Lang. (JHS 1A)", wednesday: "Science (Basic 6B)", thursday: "RME (Basic 6B)", friday: "Creative Arts (JHS 1A)" },
  { time: "11:50 - 12:30", monday: "Free Period", tuesday: "Social Studies (JHS 1A)", wednesday: "English (Basic 6B)", thursday: "Free Period", friday: "Guidance (All)" },
  { time: "12:30 - 01:10", monday: "Lunch Break", tuesday: "Lunch Break", wednesday: "Lunch Break", thursday: "Lunch Break", friday: "Lunch Break" },
  { time: "01:10 - 01:50", monday: "Computing (JHS 1A)", tuesday: "PE (Basic 6B)", wednesday: "Creative Arts (Basic 6B)", thursday: "Computing (JHS 1A)", friday: "Club Activities" },
  { time: "01:50 - 02:30", monday: "Ghanaian Lang. (Basic 6B)", tuesday: "Creative Arts (JHS 1A)", wednesday: "Ghanaian Lang. (JHS 1A)", thursday: "Ghanaian Lang. (Basic 6B)", friday: "End of Day Prep" },
];

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function TeacherTimetablePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <CalendarDays className="mr-3 h-8 w-8" /> My Teaching Timetable
        </h2>
        {/* Placeholder for potential filters like week selection or class filter if a teacher handles many */}
      </div>
      <CardDescription>
        View your weekly teaching schedule. The table will scroll horizontally on smaller screens if needed.
      </CardDescription>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>
            This is a sample timetable. Actual data would be fetched dynamically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto"> {/* Ensures horizontal scrolling on small screens */}
            <Table className="min-w-[800px] md:min-w-full"> {/* min-w to encourage scrolling on small views if needed */}
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px] font-semibold">Time</TableHead>
                  {daysOfWeek.map(day => (
                    <TableHead key={day} className="font-semibold">{day}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleTimetableData.map((entry) => (
                  <TableRow key={entry.time}>
                    <TableCell className="font-medium text-muted-foreground">{entry.time}</TableCell>
                    <TableCell>{entry.monday || ""}</TableCell>
                    <TableCell>{entry.tuesday || ""}</TableCell>
                    <TableCell>{entry.wednesday || ""}</TableCell>
                    <TableCell>{entry.thursday || ""}</TableCell>
                    <TableCell>{entry.friday || ""}</TableCell>
                  </TableRow>
                ))}
                 {sampleTimetableData.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={daysOfWeek.length + 1} className="text-center text-muted-foreground h-24">
                            No timetable data available for the selected period.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
