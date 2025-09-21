
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertCircle, Info } from "lucide-react";

export default function StudentFeeInformationPage() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-6 w-6 text-blue-600" />
            General School Fee Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-base text-muted-foreground">
            <p>
              <strong>Fee Policies:</strong> School fees are set annually and may vary by grade level and term. All students are required to settle their fees by the published deadlines to avoid late penalties or restrictions on access to school services.
            </p>
            <p>
              <strong>Payment Deadlines:</strong> Fees for each term must be paid by the first week of the term unless otherwise communicated. Late payments may incur additional charges.
            </p>
            <p>
              <strong>Accepted Payment Methods:</strong> Payments can be made via bank transfer, mobile money, or online payment gateways (e.g., Paystack). Please ensure you use your student ID as the payment reference.
            </p>
            <p>
              <strong>Accounts Office Contact:</strong> For any questions or assistance regarding your fees, please contact the Accounts Office:
              <br />
              <span className="font-medium">Email:</span> accounts@school.edu.gh
              <br />
              <span className="font-medium">Phone:</span> +233 24 123 4567
            </p>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md p-3">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-blue-800">
              For your specific fee statement and balance, please check the <strong>My Fees</strong> section.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
