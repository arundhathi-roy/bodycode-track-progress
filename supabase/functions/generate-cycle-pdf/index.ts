import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CycleData {
  id: string;
  start_date: string;
  end_date: string;
  flow_intensity: 'light' | 'medium' | 'heavy';
  symptoms: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface RequestBody {
  userEmail: string;
  cycles: CycleData[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, cycles }: RequestBody = await req.json();
    
    // Group cycles by month
    const cyclesByMonth = cycles.reduce((acc: Record<string, CycleData[]>, cycle) => {
      const monthKey = new Date(cycle.start_date).toISOString().slice(0, 7); // YYYY-MM format
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(cycle);
      return acc;
    }, {});

    // Sort months in descending order (most recent first)
    const sortedMonths = Object.keys(cyclesByMonth).sort().reverse().slice(0, 12);

    // Generate HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Menstrual Cycle Report</title>
          <style>
            body {
              font-family: 'Helvetica', Arial, sans-serif;
              margin: 40px;
              line-height: 1.6;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 2px solid #e0e0e0;
            }
            .header h1 {
              color: #2c3e50;
              margin-bottom: 10px;
            }
            .user-info {
              background-color: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 30px;
            }
            .month-section {
              margin-bottom: 30px;
              page-break-inside: avoid;
            }
            .month-header {
              background-color: #3498db;
              color: white;
              padding: 12px 20px;
              border-radius: 6px;
              margin-bottom: 15px;
              font-weight: bold;
              font-size: 18px;
            }
            .cycle-entry {
              background-color: #fff;
              border: 1px solid #ddd;
              border-radius: 6px;
              padding: 15px;
              margin-bottom: 10px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .cycle-dates {
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 8px;
            }
            .cycle-details {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .flow-intensity {
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .flow-light { background-color: #d4edda; color: #155724; }
            .flow-medium { background-color: #fff3cd; color: #856404; }
            .flow-heavy { background-color: #f8d7da; color: #721c24; }
            .no-data {
              text-align: center;
              color: #6c757d;
              font-style: italic;
              padding: 20px;
            }
            .summary {
              background-color: #e8f4f8;
              padding: 20px;
              border-radius: 8px;
              margin-top: 30px;
            }
            @media print {
              body { margin: 20px; }
              .month-section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Menstrual Cycle Report</h1>
            <p>Generated on ${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
          </div>

          <div class="user-info">
            <h3>User Information</h3>
            <p><strong>Full Name:</strong> ${userEmail.split('@')[0] || 'Not provided'}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>Report Period:</strong> Last 12 months</p>
            <p><strong>Total Cycles Recorded:</strong> ${cycles.length}</p>
          </div>

          ${sortedMonths.length > 0 ? sortedMonths.map(month => {
            const monthCycles = cyclesByMonth[month];
            const monthName = new Date(month + '-01').toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long' 
            });
            
            return `
              <div class="month-section">
                <div class="month-header">${monthName}</div>
                ${monthCycles.length > 0 ? monthCycles.map(cycle => {
                  const startDate = new Date(cycle.start_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  });
                  const endDate = new Date(cycle.end_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  });
                  const duration = Math.floor((new Date(cycle.end_date).getTime() - new Date(cycle.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  
                  return `
                    <div class="cycle-entry">
                      <div class="cycle-dates">${startDate} - ${endDate} (${duration} days)</div>
                      <div class="cycle-details">
                        <span>Flow Type:</span>
                        <span class="flow-intensity flow-${cycle.flow_intensity}">${cycle.flow_intensity}</span>
                      </div>
                      ${cycle.notes ? `<div style="margin-top: 8px; font-size: 14px; color: #666;"><strong>Notes:</strong> ${cycle.notes}</div>` : ''}
                    </div>
                  `;
                }).join('') : '<div class="no-data">No cycles recorded for this month</div>'}
              </div>
            `;
          }).join('') : '<div class="no-data">No cycle data available</div>'}

          <div class="summary">
            <h3>Report Summary</h3>
            <p>This report contains menstrual cycle data for the last 12 months. Each entry includes the start and end dates of the cycle, duration, and flow intensity. This information can be useful for tracking patterns and discussing with healthcare providers.</p>
            <p><em>Note: This report is for informational purposes only and should not replace professional medical advice.</em></p>
          </div>
        </body>
      </html>
    `;

    // Convert HTML to PDF using puppeteer
    const puppeteerUrl = "https://puppeteer-pdf-api.deno.dev/pdf";
    
    const pdfResponse = await fetch(puppeteerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        html: htmlContent,
        options: {
          format: "A4",
          margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
          },
          printBackground: true
        }
      })
    });

    if (!pdfResponse.ok) {
      throw new Error("Failed to generate PDF");
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();

    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="menstrual-cycle-report-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error("Error generating PDF:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);