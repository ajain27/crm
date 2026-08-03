// The lead follow-up drip sequence sent by api/send-scheduled-lead-emails.js
// once "Run Automation" is started on a lead (LeadDetailModal.jsx). Day
// offsets are relative to the automation's start date (the day "Run
// Automation" was clicked), not to the previous email.

export const BUSINESS_PHONE = "(206) 822-8019";
export const AUTOMATION_SENDER_EMAIL = "youwinestates@gmail.com";

export const EMAIL_SEQUENCE = [
  {
    dayOffset: 0,
    subject: "We Tried Reaching You About Your Property",
    body: `Hi {{FirstName}},

Thank you for reaching out to us about your property.

I just tried giving you a quick call regarding the information you submitted, but I wasn't able to reach you.

If you're still interested in receiving a no-obligation cash offer, simply reply to this email or let me know a good time to call. The conversation usually takes less than 10 minutes.

At You Win Estates, we buy houses in any condition. There are no commissions, no repairs, and no obligation to accept an offer.

Looking forward to hearing from you.

Best,

You Win Estates
{{Phone}}`,
  },
  {
    dayOffset: 1,
    subject: "Still Interested in a Cash Offer?",
    body: `Hi {{FirstName}},

I wanted to follow up in case you were busy yesterday.

Since you requested information about selling your property, I wanted to see if you're still interested in exploring a cash offer.

Whether you're looking to sell quickly or simply want to know what your property might be worth, we're happy to help.

Just reply with a good time to talk, or give us a call at {{Phone}}.

There's absolutely no pressure and no obligation.

Thank you,

You Win Estates`,
  },
  {
    dayOffset: 3,
    subject: "Can We Still Help You Sell Your Property?",
    body: `I haven't been able to connect with you yet, so I wanted to check in one more time.

If selling your property is still on your radar, we'd be happy to prepare a fair cash offer based on your situation.

We work with homeowners who want to avoid:

Realtor commissions
Costly repairs
Long closing timelines
Financing contingencies

If now isn't the right time, that's completely okay too. Just let me know, and I'll update my records.

Best,

You Win Estates`,
  },
  {
    dayOffset: 7,
    subject: "No Rush — We're Here When You're Ready",
    body: `Hi {{FirstName}},

I know life gets busy, so I didn't want to assume you've lost interest.

If you're still considering selling your property, we'd be happy to discuss your options and provide a cash offer with no obligation.

Many sellers simply want to understand what their options are before making a decision, and that's perfectly fine.

Whenever you're ready, just reply to this email or call us at {{Phone}}.

Have a great day!

You Win Estates`,
  },
  {
    dayOffset: 14,
    subject: "Should We Close Your File?",
    body: `Hi {{FirstName}},

I've tried reaching out a few times regarding the property information you submitted, but we haven't been able to connect.

If you've already sold the property or are no longer interested, just reply with "No Thanks" and I'll make sure we don't continue following up.

If you're still interested, we'd be happy to prepare your cash offer whenever you're ready.

Thanks again, and I hope to hear from you.

Best,

You Win Estates`,
  },
  {
    dayOffset: 30,
    subject: "Last Follow-Up",
    body: `Hi {{FirstName}},

This will be my last follow-up regarding the property inquiry you submitted.

I completely understand that circumstances change, and timing isn't always right.

If you still need a cash offer—whether that's next week or several months from now—feel free to reach out. We'll be happy to discuss your options whenever you're ready.

Thank you for considering You Win Estates.

Wishing you all the best.

You Win Estates
{{Phone}}`,
  },
];

// startedAt/nextSendAt are stored as full ISO datetime strings (not just a
// date) so they still compare correctly with plain string `<=` in Firestore,
// down to sub-day precision.
export function addDays(isoDateTime, days) {
  return new Date(
    new Date(isoDateTime).getTime() + days * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export function startEmailSequence(senderName) {
  const now = new Date().toISOString();
  return {
    status: "running",
    currentStep: 0,
    startedAt: now,
    nextSendAt: now,
    senderName: senderName || "The You Win Estates Team",
  };
}

export function stopEmailSequence(existing) {
  return { ...(existing || {}), status: "stopped" };
}

export function renderEmailTemplate(
  template,
  { firstName, senderName, phone },
) {
  const fill = (text) =>
    text
      .replaceAll("{{FirstName}}", firstName || "there")
      .replaceAll("{{SenderName}}", senderName || "The You Win Estates Team")
      .replaceAll("{{Phone}}", phone || BUSINESS_PHONE);

  return {
    subject: fill(template.subject),
    body: fill(template.body),
  };
}
