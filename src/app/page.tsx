import type { Metadata } from "next";
import { HomeContent } from "@/components/home/HomeContent";
import { JsonLd } from "@/components/common/JsonLd";
import {
  FAQS,
  ORGANIZATION_FULL_NAME,
  ORGANIZATION_NAME,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  pageMetadata,
} from "@/lib/site";

export const metadata: Metadata = pageMetadata({ path: "/" });

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "en-IN",
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ORGANIZATION_FULL_NAME,
    alternateName: ORGANIZATION_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/vawe-logo.png`,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Any (Chrome or Edge browser)",
    browserRequirements: "Requires a microphone and a modern browser such as Chrome or Edge",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    featureList: [
      "AI mock interviews with spoken answers",
      "Technical, HR and behavioural questions",
      "AI group discussion practice",
      "Grammar, fluency and repetition feedback",
      "Downloadable PDF interview report",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={structuredData} />
      <HomeContent />
    </>
  );
}
