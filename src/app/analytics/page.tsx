import AnalyticsClient from '@/components/analytics/AnalyticsClient';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  // Fetch analytics data from API
  let analyticsData = null;

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analytics`, {
      cache: 'no-store',
    });
    const result = await response.json();
    if (result.success) {
      analyticsData = result.data;
    }
  } catch (error) {
    console.error('Error fetching analytics:', error);
  }

  return <AnalyticsClient initialData={analyticsData} />;
}
