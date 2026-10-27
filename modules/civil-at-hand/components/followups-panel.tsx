"use client";

import { addDays, bucketFollowUps, collectFollowUps, dateKey, type FollowUpItem } from "@/modules/civil-at-hand/lib/followups";
import { shortDate } from "@/modules/civil-at-hand/lib/format";
import type { ContactRecord, ProjectRecord } from "@/modules/civil-at-hand/lib/types";

type Props = {
  contacts: ContactRecord[];
  projects: ProjectRecord[];
  onOpen: (item: FollowUpItem) => void;
  onUpdate: (item: FollowUpItem, followUpAt: string | null) => Promise<void>;
  onWhatsApp: (phone: string, text: string) => void;
};

const sections: { key: "overdue" | "today" | "week" | "later"; title: string; hint: string }[] = [
  { key: "overdue", title: "Overdue / देर हो चुकी", hint: "These dates have passed. Call or message them first." },
  { key: "today", title: "Today / आज", hint: "Planned for today." },
  { key: "week", title: "Next 7 days / अगले 7 दिन", hint: "Coming up this week." },
  { key: "later", title: "Later / बाद में", hint: "Scheduled further ahead." },
];

export default function FollowUpsPanel({ contacts, projects, onOpen, onUpdate, onWhatsApp }: Props) {
  const items = collectFollowUps(contacts, projects);
  const buckets = bucketFollowUps(items);
  const today = dateKey(new Date());
  if (!items.length) {
    return <div className="panel fu-empty"><h3>No follow-ups scheduled</h3><p>Open any contact or project, set a <strong>Follow-up date</strong>, and it will appear here when it is due. / किसी भी संपर्क या प्रोजेक्ट में फॉलो-अप की तारीख डालें, यहाँ दिखेगी।</p></div>;
  }
  return <div className="fu-view">
    {sections.map((section) => buckets[section.key].length ? <section className="panel fu-section" key={section.key}>
      <div className={`fu-head fu-head-${section.key}`}><div><h2>{section.title}</h2><p>{section.hint}</p></div><span className="fu-count">{buckets[section.key].length}</span></div>
      <div className="fu-list">{buckets[section.key].map((item) => <article className="fu-row" key={`${item.kind}-${item.id}`}>
        <div className="fu-main"><span className={`fu-kind fu-kind-${item.kind}`}>{item.kind === "contact" ? "Contact" : "Project"}</span><button className="fu-title" onClick={() => onOpen(item)}>{item.title}</button>{item.subtitle ? <small>{item.subtitle}</small> : null}<span className="fu-date">{shortDate(item.date)}</span></div>
        <div className="fu-actions">
          {item.kind === "contact" && item.phone ? <button className="secondary-button fu-btn" onClick={() => onWhatsApp(item.phone || "", `Hello ${item.title}, following up with you.`)}>WhatsApp</button> : null}
          {item.kind === "contact" && item.phone ? <a className="secondary-button fu-btn" href={`tel:${item.phone}`}>Call</a> : null}
          <button className="primary-button fu-btn" onClick={() => void onUpdate(item, null)}>Done ✓</button>
          <button className="secondary-button fu-btn" onClick={() => void onUpdate(item, addDays(today, 1))}>Tomorrow</button>
          <button className="secondary-button fu-btn" onClick={() => void onUpdate(item, addDays(today, 7))}>+1 week</button>
        </div>
      </article>)}</div>
    </section> : null)}
  </div>;
}
