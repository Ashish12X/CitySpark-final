import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Loader2, HelpCircle, MapPin, FileText, ListOrdered, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { apiJson } from "@/lib/api";

const Section = ({ icon, title, children }) => (
  <div className="mb-6">
    <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
      {icon}
      {title}
    </h3>
    <div className="mt-2 text-sm text-foreground">{children}</div>
  </div>
);

const FALLBACK_GUIDANCE = {
  department: "General Administration",
  steps: ["1. Submit a detailed query", "2. Visit the nearest citizen service center", "3. Follow departmental protocols"],
  documents: ["Identity Proof", "Address Proof"],
  location: "Municipal Office / Online Portal"
};

export default function AICivicAssistant() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const { t } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsLoading(true);
    setResponse(null);

    try {
      const data = await apiJson('/api/ai/assistant', {
        method: 'POST',
        body: { query: `${query} (Category: ${category}, Location: ${location})` }
      });
      setResponse(data);
    } catch (err) {
      console.warn('AI Assistant Backend failed, using local fallback:', err);
      setResponse(FALLBACK_GUIDANCE);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="container mx-auto px-4 py-12 max-w-5xl flex flex-col lg:flex-row gap-8">
      <Card className="flex-1 bg-card/60 backdrop-blur-sm border border-border/30 hover:border-primary/40 transition-shadow shadow-sm hover:shadow-lg rounded-2xl">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-2xl font-bold">{t('AI Civic Assistant')}</CardTitle>
          <CardDescription className="text-muted-foreground">{t('Get instant guidance on municipal processes, document requirements, and department routing.')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">{t('Describe your issue or what you need help with')}</label>
              <Textarea
                placeholder={t('e.g., I need to apply for a new birth certificate for my newborn child...')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={4}
                className="resize-none"
                required
                voice
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">{t('Category (Optional)')}</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('Select Category')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utilities">{t('Utilities')}</SelectItem>
                    <SelectItem value="identity">{t('Identity & Documents')}</SelectItem>
                    <SelectItem value="infrastructure">{t('Public Infrastructure')}</SelectItem>
                    <SelectItem value="other">{t('Other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">{t('Location (Optional)')}</label>
                <Input
                  placeholder={t('Enter your area or zone')}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  voice
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 shadow-lg font-bold" disabled={isLoading}>
              {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('Consulting AI...')}</>) : t('Get GUIDANCE')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="flex-1 bg-card/60 backdrop-blur-sm border border-border/30 hover:border-primary/40 transition-shadow shadow-sm hover:shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="border-b pb-4 bg-muted/20">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
             <Lightbulb className="w-6 h-6 text-primary" />
             {t('Guidance Result')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">{t('Analyzing municipal protocols...')}</p>
              </motion.div>
            ) : response ? (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <Section icon={<Badge variant="outline" className="bg-primary/10 text-primary p-1.5"><HelpCircle className="w-4 h-4" /></Badge>} title={t('Handling Department')}>
                  <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 font-bold text-primary">
                    {t(response.department)}
                  </div>
                </Section>
                <Section icon={<Badge variant="outline" className="bg-orange-100 text-orange-700 p-1.5"><MapPin className="w-4 h-4" /></Badge>} title={t('Where to Go')}>
                  <p className="text-sm font-medium">{t(response.location || response.where_to_go)}</p>
                </Section>
                <Section icon={<Badge variant="outline" className="bg-blue-100 text-blue-700 p-1.5"><FileText className="w-4 h-4" /></Badge>} title={t('Required Documents')}>
                  <div className="grid grid-cols-1 gap-2">
                    {response.documents?.map((doc, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg text-xs font-semibold">
                         <div className="h-1.5 w-1.5 rounded-full bg-blue-500" /> {t(doc)}
                      </div>
                    ))}
                  </div>
                </Section>
                <Section icon={<Badge variant="outline" className="bg-emerald-100 text-emerald-700 p-1.5"><ListOrdered className="w-4 h-4" /></Badge>} title={t('Step-by-Step Procedure')}>
                  <div className="space-y-3">
                    {response.steps?.map((step, i) => (
                      <div key={i} className="flex gap-3 text-sm p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                         <span className="font-black text-emerald-600">0{i+1}</span>
                         <span className="font-medium">{t(step)}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 opacity-50">
                <div className="p-4 rounded-full bg-muted shadow-inner"><HelpCircle className="h-8 w-8 text-muted-foreground" /></div>
                <p className="text-sm font-medium text-muted-foreground max-w-[200px]">{t('Submit your query to get AI-powered municipal guidance.')}</p>
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </section>
  );
}
