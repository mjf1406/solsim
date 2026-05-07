import { APP_NAME, FEEDBACK_GOOGLE_FORM_URL } from "@/lib/constants"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ExternalLink } from "lucide-react"

export const FAQSection = () => {
  return (
    <section id="faq" className="container py-24 sm:py-32 md:w-[700px]">
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-center text-lg tracking-wider text-primary">
          FAQS
        </h2>

        <h2 className="text-center text-3xl font-bold md:text-4xl">
          Common Questions
        </h2>
      </div>

      <Accordion type="single" collapsible className="AccordionRoot">
        <AccordionItem value="item-1">
          <AccordionTrigger className="text-left">
            It&apos;s free!
          </AccordionTrigger>
          <AccordionContent>
            <p>
              {APP_NAME} will be free for as long as it costs me nothing to
              host. I do accept donations if you feel so inclined. Click{" "}
              <a className="" href="/about#donations">
                here
              </a>{" "}
              to donate.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-feedback">
          <AccordionTrigger className="text-left">
            How do I submit feedback?
          </AccordionTrigger>
          <AccordionContent>
            <p>
              Fill out{" "}
              {FEEDBACK_GOOGLE_FORM_URL ? (
                <a
                  className="inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:text-primary/90"
                  href={FEEDBACK_GOOGLE_FORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  this Google Form
                  <ExternalLink aria-hidden className="size-3.5 shrink-0" />
                  <span className="sr-only">(opens in new tab)</span>
                </a>
              ) : (
                "this Google Form"
              )}
              .
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  )
}
