import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FileText, MapPin, CheckCircle2, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';

const PORTAL_META = {
  'birth-certificate': { href: 'https://health.city.gov/birth', isHttp: true },
  'pothole-complaint': { href: '/map', isHttp: false },
  electricity: { href: 'https://power.city.gov/report', isHttp: true },
  'income-certificate': { href: 'https://edistrict.gov.in', isHttp: true },
  'water-connection': { href: 'https://water.city.gov/new-connection', isHttp: true },
  generic: { href: 'https://municipal.gov/services', isHttp: true },
};

const SCHEMES = [
  {
    id: 'birth-certificate',
    keywords: ['birth', 'born', 'child'],
    title: 'Apply for Birth Certificate',
    description: 'Get a new birth certificate or a copy of an existing one.',
    department: 'Department of Health',
    location: 'City Hall, Room 102',
    documents: ['ID Proof of Parents', 'Hospital Discharge Summary', 'Marriage Certificate (Optional)'],
    steps: [
      'Fill out the online application form',
      'Upload the required documents in PDF format',
      'Pay the processing fee ($15)',
      'Wait for SMS confirmation (typically 3-5 days)',
      'Download digital copy or collect physical copy from City Hall',
    ],
  },
  {
    id: 'pothole-complaint',
    keywords: ['pothole', 'road', 'street', 'broken'],
    title: 'Complain about Road/Pothole',
    description: 'Report road damage, potholes, or damaged pavements.',
    department: 'Public Works Department',
    location: 'City Maintenance Office, Block B',
    documents: ['Photo of the issue', 'Exact location coordinates'],
    steps: [
      'Open the CitySpark Report page',
      'Enter the exact location using the GPS auto-detect',
      'Upload the photo & submit your report',
      'Municipal workers will inspect within 48 hours',
      'Track progress on your Dashboard',
    ],
  },
  {
    id: 'electricity',
    keywords: ['power', 'electricity', 'light', 'outage', 'wire'],
    title: 'Report Power Outage',
    description: 'Notify the electricity board about power cuts or broken streetlights.',
    department: 'Electricity Board',
    location: '12 Power Grid Avenue',
    documents: ['Customer Account Number', 'Recent Electricity Bill'],
    steps: [
      'Check if it is a planned outage on the Electricity Board website',
      'If unplanned, submit a report with your account number',
      'Wait for the board to dispatch line workers',
      'Updates will be provided via SMS',
    ],
  },
  {
    id: 'income-certificate',
    keywords: ['income', 'salary', 'pension'],
    title: 'Income Certificate Application',
    description: 'Official document certifying your annual income for scholarships and subsidies.',
    department: 'Revenue Department',
    location: 'Tehsil Office / District Magistrate Office',
    documents: ['Aadhar Card', 'Ration Card / Address Proof', 'Salary Slip / Income Proof', 'Passport Size Photo'],
    steps: [
      'Visit the local Tehsil or e-District portal.',
      'Fill out the Income Certificate Application form.',
      'Attach the required self-attested documents and photograph.',
      'Pay the minimal processing fee online.',
      'The Patwari/Lekhpal will digitally verify the details.',
      'Certificate is issued and downloadable within 7-15 working days.',
    ],
  },
  {
    id: 'water-connection',
    keywords: ['water', 'pipe', 'plumbing'],
    title: 'New Water Connection',
    description: 'Apply for a new municipal water pipeline connection for residential properties.',
    department: 'Water & Sanitation Authority',
    location: 'Public Health Engineering Dept, Zone 4',
    documents: ['Property Tax Receipt', 'Registered Sale Deed / Lease Agreement', 'Aadhar Card', 'Plumber Certification'],
    steps: [
      'Submit the application form online or at the Zone office.',
      'A Junior Engineer (JE) will schedule a site inspection.',
      'Pay the estimated connection fee based on the JE report.',
      'A licensed municipal plumber will execute the connection.',
      'Connection activated within 14 working days of fee payment.',
    ],
  },
  {
    id: 'generic',
    keywords: [],
    title: 'Civic Process Guidance',
    description: 'General instructions for municipal administrative tasks based on your inquiry.',
    department: 'General Municipal Administration',
    location: 'City Hall, Central Helpdesk',
    documents: ['Valid Government ID', 'Application Form', 'Address Proof (Utility Bill/Aadhar)'],
    steps: [
      'Visit the main city hall helpdesk or browse the municipal portal.',
      'Inquire about the specific department handling your specific request.',
      'Submit standard identification documents to the designated clerk.',
      'Follow the directed procedural steps provided by the administration.',
      'Keep the application reference number for tracking.',
    ],
  },
];

const Services = () => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsAnalyzing(true);
    setResult(null);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const q = query.toLowerCase();
    let found = SCHEMES.find((s) => s.keywords.some((k) => q.includes(k)));

    if (!found) {
      if (q.includes('income') || q.includes('salary') || q.includes('pension')) {
        found = SCHEMES.find(s => s.id === 'income-certificate');
      } else if (q.includes('water') || q.includes('pipe') || q.includes('plumbing')) {
        found = SCHEMES.find(s => s.id === 'water-connection');
      } else {
        found = SCHEMES.find(s => s.id === 'generic');
      }
    }

    const portal = PORTAL_META[found.id] || PORTAL_META.generic;
    setResult({ ...found, portalHref: portal.href, portalIsHttp: portal.isHttp });
    setIsAnalyzing(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 lg:py-16 max-w-4xl flex flex-col gap-10">
      <div className="flex flex-col items-center text-center space-y-4 max-w-2xl mx-auto">
        <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-2 shadow-inner">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">{t('AI Civic Assistant')}</h1>
        <p className="text-muted-foreground text-lg mb-6">{t('Describe what you need, and our AI instantly points you to the right department.')}</p>

        <form onSubmit={handleAnalyze} className="w-full relative mt-4">
          <Input
            placeholder={t('Search for a service... (e.g. Apply for birth certificate)')}
            className="pl-6 pr-32 h-16 rounded-full shadow-lg text-base border-primary/20 bg-background/80 backdrop-blur-sm focus-visible:ring-primary/50"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isAnalyzing}
          />
          <Button
            type="submit"
            disabled={!query.trim() || isAnalyzing}
            className="absolute right-2 top-2 h-12 rounded-full px-6 font-semibold shadow-antigravity"
          >
            {isAnalyzing ? t('Analyzing...') : t('Analyze')}
          </Button>
        </form>
      </div>

      <div className="w-full mt-4">
        <AnimatePresence mode="wait">
          {isAnalyzing && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-64 flex flex-col items-center justify-center space-y-4 bg-muted/30 rounded-3xl border border-dashed border-border"
            >
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-muted-foreground font-medium animate-pulse">{t('Scanning municipal database...')}</p>
            </motion.div>
          )}

          {result && !isAnalyzing && (
            <motion.div
              key={result.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="shadow-2xl bg-card border-primary/20 overflow-hidden relative">
                <CardHeader className="border-b bg-muted/30 pb-6 pt-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-primary text-primary-foreground text-xs px-2.5 py-1 rounded-sm uppercase font-bold tracking-wider shadow-sm">
                      {t(result.department)}
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-sm">
                      {t('Verified Match')}
                    </span>
                  </div>
                  <CardTitle className="text-3xl font-extrabold">{t(result.title)}</CardTitle>
                  <CardDescription className="text-base text-muted-foreground mt-2 max-w-2xl">{t(result.description)}</CardDescription>
                </CardHeader>

                <CardContent className="p-6 md:p-8 space-y-10">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-start gap-4 bg-primary/5 p-5 rounded-2xl flex-1 border border-primary/10 hover:border-primary/30 transition-colors">
                      <div className="bg-background p-2.5 rounded-xl shadow-sm">
                        <MapPin className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary mb-1 uppercase tracking-wider">{t('WHERE TO GO')}</p>
                        <p className="font-semibold text-base leading-snug text-foreground">{t(result.location)}</p>
                        <a href={result.portalHref} className="text-sm text-primary font-bold hover:underline mt-2 inline-flex items-center">
                          {result.portalIsHttp ? t('Visit Official Portal') : t('Use App Tracker')} <ArrowRight className="w-3 h-3 ml-1" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="flex items-center gap-2 text-xl font-bold mb-5 border-b pb-3">
                      <FileText className="h-5 w-5 text-primary" /> {t('Required Documents')}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {result.documents.map((doc, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm bg-background border border-border/80 rounded-xl px-4 py-3.5 shadow-sm hover:shadow-md transition-shadow">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                          <span className="font-medium text-foreground">{t(doc)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xl font-bold mb-6 border-b pb-3">{t('Step-by-Step Procedure')}</h4>
                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/50 before:via-border/50 before:to-transparent">
                      {result.steps.map((step, i) => (
                        <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary text-primary-foreground font-bold shadow-md shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-transform group-hover:scale-110">
                            {i + 1}
                          </div>
                          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-background p-5 rounded-2xl border shadow-sm group-hover:shadow-md transition-all group-hover:-translate-y-1">
                            <p className="text-sm font-medium leading-relaxed">{t(step)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Services;
