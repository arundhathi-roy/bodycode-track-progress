import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DailyFlowEntry {
  id: string;
  flow_date: string;
  flow_intensity: 'light' | 'medium' | 'heavy';
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface RequestBody {
  userEmail: string;
  dailyEntries: DailyFlowEntry[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, dailyEntries }: RequestBody = await req.json();
    
    // Group entries by month
    const entriesByMonth = dailyEntries.reduce((acc: Record<string, DailyFlowEntry[]>, entry) => {
      const monthKey = new Date(entry.flow_date).toISOString().slice(0, 7); // YYYY-MM format
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(entry);
      return acc;
    }, {});

    // Sort months in descending order (most recent first) and limit to 12
    const sortedMonths = Object.keys(entriesByMonth).sort().reverse().slice(0, 12);

    // Calculate statistics
    const totalDays = dailyEntries.length;
    const lightDays = dailyEntries.filter(e => e.flow_intensity === 'light').length;
    const mediumDays = dailyEntries.filter(e => e.flow_intensity === 'medium').length;
    const heavyDays = dailyEntries.filter(e => e.flow_intensity === 'heavy').length;

    // Generate HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Daily Flow Report</title>
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
            .stats-section {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .stat-card {
              background-color: #e8f4f8;
              padding: 15px;
              border-radius: 6px;
              text-align: center;
            }
            .stat-number {
              font-size: 24px;
              font-weight: bold;
              color: #2c3e50;
            }
            .stat-label {
              font-size: 12px;
              color: #666;
              margin-top: 5px;
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
            .day-entry {
              background-color: #fff;
              border: 1px solid #ddd;
              border-radius: 6px;
              padding: 12px;
              margin-bottom: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .day-info {
              flex: 1;
            }
            .day-date {
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 4px;
            }
            .day-notes {
              font-size: 12px;
              color: #666;
              margin-top: 4px;
              font-style: italic;
            }
            .flow-intensity {
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .flow-light { 
              background-color: #d4edda; 
              color: #155724; 
            }
            .flow-medium { 
              background-color: #fff3cd; 
              color: #856404; 
            }
            .flow-heavy { 
              background-color: #f8d7da; 
              color: #721c24; 
            }
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
              .stats-section { 
                grid-template-columns: repeat(2, 1fr); 
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Daily Flow Report</h1>
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
            <p><strong>Total Days Tracked:</strong> ${totalDays}</p>
          </div>

          <div class="stats-section">
            <div class="stat-card">
              <div class="stat-number">${totalDays}</div>
              <div class="stat-label">Total Days</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${lightDays}</div>
              <div class="stat-label">Light Flow Days</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${mediumDays}</div>
              <div class="stat-label">Medium Flow Days</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${heavyDays}</div>
              <div class="stat-label">Heavy Flow Days</div>
            </div>
          </div>

          ${sortedMonths.length > 0 ? sortedMonths.map(month => {
            const monthEntries = entriesByMonth[month].sort((a, b) => 
              new Date(b.flow_date).getTime() - new Date(a.flow_date).getTime()
            );
            const monthName = new Date(month + '-01').toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long' 
            });
            
            return `
              <div class="month-section">
                <div class="month-header">${monthName}</div>
                ${monthEntries.length > 0 ? monthEntries.map(entry => {
                  const entryDate = new Date(entry.flow_date);
                  const dayOfWeek = entryDate.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayMonth = entryDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  });
                  
                  return `
                    <div class="day-entry">
                      <div class="day-info">
                        <div class="day-date">${dayOfWeek}, ${dayMonth}</div>
                        ${entry.notes ? `<div class="day-notes">${entry.notes}</div>` : ''}
                      </div>
                      <div class="flow-intensity flow-${entry.flow_intensity}">
                        ${entry.flow_intensity}
                      </div>
                    </div>
                  `;
                }).join('') : '<div class="no-data">No entries recorded for this month</div>'}
              </div>
            `;
          }).join('') : '<div class="no-data">No daily flow data available</div>'}

          <div class="summary">
            <h3>Report Summary</h3>
            <p>This report contains daily menstrual flow tracking data for the last 12 months. Each entry includes the date, flow intensity, and any personal notes recorded. This detailed tracking can help identify patterns and provide valuable information for healthcare discussions.</p>
            <p><strong>Key Insights:</strong></p>
            <ul>
              <li>Average flow intensity: ${heavyDays > mediumDays && heavyDays > lightDays ? 'Heavy' : mediumDays > lightDays ? 'Medium' : 'Light'}</li>
              <li>Most common flow type: ${
                lightDays > mediumDays && lightDays > heavyDays ? `Light (${((lightDays/totalDays)*100).toFixed(1)}%)` :
                mediumDays > heavyDays ? `Medium (${((mediumDays/totalDays)*100).toFixed(1)}%)` :
                `Heavy (${((heavyDays/totalDays)*100).toFixed(1)}%)`
              }</li>
              <li>Total tracking days: ${totalDays} days</li>
            </ul>
            <p><em>Note: This report is for informational purposes only and should not replace professional medical advice.</em></p>
          </div>
        </body>
      </html>
    `;

    // For demo purposes, return the HTML as a blob that would be converted to PDF
    // In a real implementation, you would use a PDF generation service
    return new Response(htmlContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="daily-flow-report-${new Date().toISOString().split('T')[0]}.html"`,
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