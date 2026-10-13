-- Historical demo rentals, approved 2026-10-12. Run this ENTIRE file.
-- Read historical-rentals-guide.md and back up the database first.
-- No schema changes, deletions, sequence resets, or real money movement.
BEGIN;
SET LOCAL TIME ZONE 'Asia/Singapore';
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
SET LOCAL search_path = pg_temp, public, pg_catalog;
SET LOCAL row_security = off;

CREATE TEMP TABLE hist_settings (apply_changes boolean NOT NULL) ON COMMIT DROP;
INSERT INTO hist_settings VALUES (false);

CREATE TEMP TABLE hist_manifest (data jsonb NOT NULL) ON COMMIT DROP;
INSERT INTO hist_manifest VALUES ($manifest$
{
  "batch": "rentnest-historical-rentals-20261012-v1",
  "timezone": "Asia/Singapore",
  "cutoff": "2026-10-12 18:00:00",
  "totals": {
    "rentals": 35,
    "offers": 35,
    "payments": 225,
    "payment_amount_sgd": 1031250,
    "redated_messages": 204,
    "text_changes": 78
  },
  "discussions": [
    {
      "listingid": 59,
      "ownerid": 1,
      "tenantid": 22,
      "owner_name": "Superman",
      "tenant_name": "Marcus Ho",
      "months": 18,
      "before_listing": {
        "listingid": 59,
        "owneruserid": 1,
        "tenantuserid": null,
        "name": "Toa Payoh Two-Bedroom HDB",
        "location": "85 Lorong 4 Toa Payoh, Toa Payoh",
        "price": 2700,
        "flagged": false,
        "created_at": "2026-10-12 06:21:23.816069"
      },
      "after_listing": {
        "listingid": 59,
        "owneruserid": 1,
        "tenantuserid": 22,
        "name": "Toa Payoh Two-Bedroom HDB",
        "location": "85 Lorong 4 Toa Payoh, Toa Payoh",
        "price": 2700,
        "flagged": false,
        "created_at": "2026-04-04 18:00:00.000"
      },
      "users": [
        {
          "userid": 1,
          "name": "Superman",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-05 09:30:00"
        },
        {
          "userid": 22,
          "name": "Marcus Ho",
          "role": "USER",
          "flagged": 0,
          "created_at": "2026-03-15 12:20:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T14:20:00",
            "message": "Hi, is the Toa Payoh flat still available? I'm looking to move closer to my parents.",
            "rentalid": null,
            "senderid": 22,
            "listingid": 59,
            "messageid": 210,
            "requestid": null,
            "receiverid": 1,
            "listing_name_snapshot": "Toa Payoh Two-Bedroom HDB",
            "listing_address_snapshot": "85 Lorong 4 Toa Payoh, Toa Payoh"
          },
          "after": {
            "date": "2026-04-05 14:20:00.000",
            "message": "Hi, is the Toa Payoh flat still available? I'm looking to move closer to my parents.",
            "rentalid": null,
            "senderid": 22,
            "listingid": 59,
            "messageid": 210,
            "requestid": null,
            "receiverid": 1,
            "listing_name_snapshot": "Toa Payoh Two-Bedroom HDB",
            "listing_address_snapshot": "85 Lorong 4 Toa Payoh, Toa Payoh"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T14:24:00",
            "message": "Hi Marcus, yes, it is still available. When are you hoping to move?",
            "rentalid": null,
            "senderid": 1,
            "listingid": null,
            "messageid": 211,
            "requestid": null,
            "receiverid": 22,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-04-05 14:24:00.000",
            "message": "Hi Marcus, yes, it is still available. When are you hoping to move?",
            "rentalid": null,
            "senderid": 1,
            "listingid": null,
            "messageid": 211,
            "requestid": null,
            "receiverid": 22,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T14:31:00",
            "message": "Around the start of next month. Could I view it after work one evening?",
            "rentalid": null,
            "senderid": 22,
            "listingid": null,
            "messageid": 215,
            "requestid": null,
            "receiverid": 1,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-04-05 14:31:00.000",
            "message": "In the next few days if it suits us. Could I view it after work one evening?",
            "rentalid": null,
            "senderid": 22,
            "listingid": null,
            "messageid": 215,
            "requestid": null,
            "receiverid": 1,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T14:38:00",
            "message": "An evening viewing should be possible. Would Wednesday around 7 work for you?",
            "rentalid": null,
            "senderid": 1,
            "listingid": null,
            "messageid": 221,
            "requestid": null,
            "receiverid": 22,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-04-05 14:38:00.000",
            "message": "An evening viewing should be possible. Would Monday around 7 work for you?",
            "rentalid": null,
            "senderid": 1,
            "listingid": null,
            "messageid": 221,
            "requestid": null,
            "receiverid": 22,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T14:46:00",
            "message": "Wednesday sounds good. I'd like to see the rooms before deciding on the lease length.",
            "rentalid": null,
            "senderid": 22,
            "listingid": null,
            "messageid": 229,
            "requestid": null,
            "receiverid": 1,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-04-05 14:46:00.000",
            "message": "Monday sounds good. I'd like to see the rooms before deciding on the lease length.",
            "rentalid": null,
            "senderid": 22,
            "listingid": null,
            "messageid": 229,
            "requestid": null,
            "receiverid": 1,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T14:55:00",
            "message": "Sure, let's keep Wednesday as a tentative slot. Message me once you've checked your schedule.",
            "rentalid": null,
            "senderid": 1,
            "listingid": null,
            "messageid": 241,
            "requestid": null,
            "receiverid": 22,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-04-05 14:55:00.000",
            "message": "Sure, let's keep Monday as a tentative slot. Message me once you've checked your schedule.",
            "rentalid": null,
            "senderid": 1,
            "listingid": null,
            "messageid": 241,
            "requestid": null,
            "receiverid": 22,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 59,
        "tenant_userid": 22,
        "rental_price": 2700,
        "deposit_price": 2700,
        "created_at": "2026-04-07 17:00:00.000",
        "accepted_at": "2026-04-08 18:00:00.000",
        "rental_date": "2026-04-08 18:00:00.000",
        "lease_expiry": "2027-10-08 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 1,
        "receiverid": 22,
        "date": "2026-04-07 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 2700,
          "date": "2026-04-08 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 2700,
          "date": "2026-05-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2700,
          "date": "2026-06-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2700,
          "date": "2026-07-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2700,
          "date": "2026-08-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2700,
          "date": "2026-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2700,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 61,
      "ownerid": 2,
      "tenantid": 23,
      "owner_name": "Batman",
      "tenant_name": "Divya Krishnan",
      "months": 24,
      "before_listing": {
        "listingid": 61,
        "owneruserid": 2,
        "tenantuserid": null,
        "name": "Tampines Three-Bedroom HDB",
        "location": "Tampines Street 43",
        "price": 3850,
        "flagged": false,
        "created_at": "2026-10-12 06:21:23.816069"
      },
      "after_listing": {
        "listingid": 61,
        "owneruserid": 2,
        "tenantuserid": 23,
        "name": "Tampines Three-Bedroom HDB",
        "location": "Tampines Street 43",
        "price": 3850,
        "flagged": false,
        "created_at": "2026-03-05 18:00:00.000"
      },
      "users": [
        {
          "userid": 2,
          "name": "Batman",
          "role": "USER",
          "flagged": 0,
          "created_at": "2026-02-21 18:15:00"
        },
        {
          "userid": 23,
          "name": "Divya Krishnan",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-07-02 10:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T14:24:00",
            "message": "Hello, I'm interested in the Tampines flat. Are you arranging viewings this week?",
            "rentalid": null,
            "senderid": 23,
            "listingid": 61,
            "messageid": 212,
            "requestid": null,
            "receiverid": 2,
            "listing_name_snapshot": "Tampines Three-Bedroom HDB",
            "listing_address_snapshot": "Tampines Street 43"
          },
          "after": {
            "date": "2026-03-06 14:20:00.000",
            "message": "Hello, I'm interested in the Tampines flat. Are you arranging viewings this week?",
            "rentalid": null,
            "senderid": 23,
            "listingid": 61,
            "messageid": 212,
            "requestid": null,
            "receiverid": 2,
            "listing_name_snapshot": "Tampines Three-Bedroom HDB",
            "listing_address_snapshot": "Tampines Street 43"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T14:28:00",
            "message": "Hi Divya, yes. Do you prefer a weekday evening or the weekend?",
            "rentalid": null,
            "senderid": 2,
            "listingid": null,
            "messageid": 213,
            "requestid": null,
            "receiverid": 23,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-03-06 14:24:00.000",
            "message": "Hi Divya, yes. Do you prefer an evening or a daytime visit?",
            "rentalid": null,
            "senderid": 2,
            "listingid": null,
            "messageid": 213,
            "requestid": null,
            "receiverid": 23,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T14:35:00",
            "message": "Saturday morning would be easier. Is the asking rent still S$3,850 a month?",
            "rentalid": null,
            "senderid": 23,
            "listingid": null,
            "messageid": 218,
            "requestid": null,
            "receiverid": 2,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-03-06 14:31:00.000",
            "message": "Saturday morning would be easier. Is the asking rent still S$3,850 a month?",
            "rentalid": null,
            "senderid": 23,
            "listingid": null,
            "messageid": 218,
            "requestid": null,
            "receiverid": 2,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T14:42:00",
            "message": "Yes, S$3,850 is the current asking rent. What move-in period are you considering?",
            "rentalid": null,
            "senderid": 2,
            "listingid": null,
            "messageid": 225,
            "requestid": null,
            "receiverid": 23,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-03-06 14:38:00.000",
            "message": "Yes, S$3,850 is the current asking rent. What move-in period are you considering?",
            "rentalid": null,
            "senderid": 2,
            "listingid": null,
            "messageid": 225,
            "requestid": null,
            "receiverid": 23,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T14:50:00",
            "message": "Late next month, but I have some flexibility. I'd like to view it first.",
            "rentalid": null,
            "senderid": 23,
            "listingid": null,
            "messageid": 234,
            "requestid": null,
            "receiverid": 2,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-03-06 14:46:00.000",
            "message": "In the next few days, but I have some flexibility. I'd like to view it first.",
            "rentalid": null,
            "senderid": 23,
            "listingid": null,
            "messageid": 234,
            "requestid": null,
            "receiverid": 2,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T14:59:00",
            "message": "That helps. Let me check the Saturday slots and get back to you here.",
            "rentalid": null,
            "senderid": 2,
            "listingid": null,
            "messageid": 247,
            "requestid": null,
            "receiverid": 23,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-03-06 14:55:00.000",
            "message": "That helps. Let me check the Saturday slots and get back to you here.",
            "rentalid": null,
            "senderid": 2,
            "listingid": null,
            "messageid": 247,
            "requestid": null,
            "receiverid": 23,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 61,
        "tenant_userid": 23,
        "rental_price": 3850,
        "deposit_price": 3850,
        "created_at": "2026-03-08 17:00:00.000",
        "accepted_at": "2026-03-09 18:00:00.000",
        "rental_date": "2026-03-09 18:00:00.000",
        "lease_expiry": "2028-03-09 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 2,
        "receiverid": 23,
        "date": "2026-03-08 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 3850,
          "date": "2026-03-09 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 3850,
          "date": "2026-04-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3850,
          "date": "2026-05-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3850,
          "date": "2026-06-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3850,
          "date": "2026-07-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3850,
          "date": "2026-08-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3850,
          "date": "2026-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3850,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 63,
      "ownerid": 3,
      "tenantid": 24,
      "owner_name": "Green Lantern",
      "tenant_name": "Leila Hamid",
      "months": 15,
      "before_listing": {
        "listingid": 63,
        "owneruserid": 3,
        "tenantuserid": null,
        "name": "Queenstown Two-Bedroom HDB",
        "location": "Commonwealth Avenue",
        "price": 3100,
        "flagged": false,
        "created_at": "2026-10-12 06:21:23.816069"
      },
      "after_listing": {
        "listingid": 63,
        "owneruserid": 3,
        "tenantuserid": 24,
        "name": "Queenstown Two-Bedroom HDB",
        "location": "Commonwealth Avenue",
        "price": 3100,
        "flagged": false,
        "created_at": "2026-09-18 18:00:00.000"
      },
      "users": [
        {
          "userid": 3,
          "name": "Green Lantern",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-06-06 17:45:00"
        },
        {
          "userid": 24,
          "name": "Leila Hamid",
          "role": "USER",
          "flagged": 0,
          "created_at": "2026-09-09 16:30:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T14:28:00",
            "message": "Hi, may I check whether the Queenstown flat is still open for enquiries?",
            "rentalid": null,
            "senderid": 24,
            "listingid": 63,
            "messageid": 214,
            "requestid": null,
            "receiverid": 3,
            "listing_name_snapshot": "Queenstown Two-Bedroom HDB",
            "listing_address_snapshot": "Commonwealth Avenue"
          },
          "after": {
            "date": "2026-09-19 14:20:00.000",
            "message": "Hi, may I check whether the Queenstown flat is still open for enquiries?",
            "rentalid": null,
            "senderid": 24,
            "listingid": 63,
            "messageid": 214,
            "requestid": null,
            "receiverid": 3,
            "listing_name_snapshot": "Queenstown Two-Bedroom HDB",
            "listing_address_snapshot": "Commonwealth Avenue"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T14:32:00",
            "message": "Hi Leila, it is. What would you like to know before arranging a visit?",
            "rentalid": null,
            "senderid": 3,
            "listingid": null,
            "messageid": 216,
            "requestid": null,
            "receiverid": 24,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-19 14:24:00.000",
            "message": "Hi Leila, it is. What would you like to know before arranging a visit?",
            "rentalid": null,
            "senderid": 3,
            "listingid": null,
            "messageid": 216,
            "requestid": null,
            "receiverid": 24,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T14:39:00",
            "message": "I'm comparing a few places around Queenstown. Could I check the layout in person?",
            "rentalid": null,
            "senderid": 24,
            "listingid": null,
            "messageid": 222,
            "requestid": null,
            "receiverid": 3,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-19 14:31:00.000",
            "message": "I'm comparing a few places around Queenstown. Could I check the layout in person?",
            "rentalid": null,
            "senderid": 24,
            "listingid": null,
            "messageid": 222,
            "requestid": null,
            "receiverid": 3,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T14:46:00",
            "message": "Of course. Which day would be convenient for you?",
            "rentalid": null,
            "senderid": 3,
            "listingid": null,
            "messageid": 230,
            "requestid": null,
            "receiverid": 24,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-19 14:38:00.000",
            "message": "Of course. Which day would be convenient for you?",
            "rentalid": null,
            "senderid": 3,
            "listingid": null,
            "messageid": 230,
            "requestid": null,
            "receiverid": 24,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T14:54:00",
            "message": "Thursday after 6 would suit me. I'm not ready to decide on a place yet.",
            "rentalid": null,
            "senderid": 24,
            "listingid": null,
            "messageid": 239,
            "requestid": null,
            "receiverid": 3,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-19 14:46:00.000",
            "message": "Sunday after 6 would suit me. I'm not ready to decide on a place yet.",
            "rentalid": null,
            "senderid": 24,
            "listingid": null,
            "messageid": 239,
            "requestid": null,
            "receiverid": 3,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T15:03:00",
            "message": "No problem. I'll check whether Thursday works and confirm a time before you travel over.",
            "rentalid": null,
            "senderid": 3,
            "listingid": null,
            "messageid": 253,
            "requestid": null,
            "receiverid": 24,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-19 14:55:00.000",
            "message": "No problem. I'll check whether Sunday works and confirm a time before you travel over.",
            "rentalid": null,
            "senderid": 3,
            "listingid": null,
            "messageid": 253,
            "requestid": null,
            "receiverid": 24,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 63,
        "tenant_userid": 24,
        "rental_price": 3100,
        "deposit_price": 3100,
        "created_at": "2026-09-21 17:00:00.000",
        "accepted_at": "2026-09-22 18:00:00.000",
        "rental_date": "2026-09-22 18:00:00.000",
        "lease_expiry": "2027-12-22 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 3,
        "receiverid": 24,
        "date": "2026-09-21 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 3100,
          "date": "2026-09-22 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 3100,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 66,
      "ownerid": 4,
      "tenantid": 25,
      "owner_name": "Wonder Woman",
      "tenant_name": "Ethan Koh",
      "months": 30,
      "before_listing": {
        "listingid": 66,
        "owneruserid": 4,
        "tenantuserid": null,
        "name": "Bukit Timah Terrace House",
        "location": "Jalan Kampong Chantek",
        "price": 9500,
        "flagged": false,
        "created_at": "2026-10-12 06:21:23.816069"
      },
      "after_listing": {
        "listingid": 66,
        "owneruserid": 4,
        "tenantuserid": 25,
        "name": "Bukit Timah Terrace House",
        "location": "Jalan Kampong Chantek",
        "price": 9500,
        "flagged": false,
        "created_at": "2026-08-30 18:00:00.000"
      },
      "users": [
        {
          "userid": 4,
          "name": "Wonder Woman",
          "role": "USER",
          "flagged": 0,
          "created_at": "2026-08-20 10:00:00"
        },
        {
          "userid": 25,
          "name": "Ethan Koh",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-09 10:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T14:32:00",
            "message": "Hi, I'm interested in the Bukit Timah terrace. Could we arrange a viewing?",
            "rentalid": null,
            "senderid": 25,
            "listingid": 66,
            "messageid": 217,
            "requestid": null,
            "receiverid": 4,
            "listing_name_snapshot": "Bukit Timah Terrace House",
            "listing_address_snapshot": "Jalan Kampong Chantek"
          },
          "after": {
            "date": "2026-08-31 14:20:00.000",
            "message": "Hi, I'm interested in the Bukit Timah terrace. Could we arrange a viewing?",
            "rentalid": null,
            "senderid": 25,
            "listingid": 66,
            "messageid": 217,
            "requestid": null,
            "receiverid": 4,
            "listing_name_snapshot": "Bukit Timah Terrace House",
            "listing_address_snapshot": "Jalan Kampong Chantek"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T14:36:00",
            "message": "Hi Ethan, certainly. Are you looking for an immediate move or planning ahead?",
            "rentalid": null,
            "senderid": 4,
            "listingid": null,
            "messageid": 219,
            "requestid": null,
            "receiverid": 25,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-08-31 14:24:00.000",
            "message": "Hi Ethan, certainly. Are you looking for an immediate move or planning ahead?",
            "rentalid": null,
            "senderid": 4,
            "listingid": null,
            "messageid": 219,
            "requestid": null,
            "receiverid": 25,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T14:43:00",
            "message": "Planning ahead for December. I'd like to bring my family to look at the space.",
            "rentalid": null,
            "senderid": 25,
            "listingid": null,
            "messageid": 226,
            "requestid": null,
            "receiverid": 4,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-08-31 14:31:00.000",
            "message": "I'm ready to move soon if it suits us. I'd like to bring my family to look at the space.",
            "rentalid": null,
            "senderid": 25,
            "listingid": null,
            "messageid": 226,
            "requestid": null,
            "receiverid": 4,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T14:50:00",
            "message": "Understood. A weekend viewing may give you more time to look around.",
            "rentalid": null,
            "senderid": 4,
            "listingid": null,
            "messageid": 235,
            "requestid": null,
            "receiverid": 25,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-08-31 14:38:00.000",
            "message": "Understood. A daytime viewing may give you more time to look around.",
            "rentalid": null,
            "senderid": 4,
            "listingid": null,
            "messageid": 235,
            "requestid": null,
            "receiverid": 25,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T14:58:00",
            "message": "Sunday afternoon would be useful. Is the listed S$9,500 the monthly asking rent?",
            "rentalid": null,
            "senderid": 25,
            "listingid": null,
            "messageid": 245,
            "requestid": null,
            "receiverid": 4,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-08-31 14:46:00.000",
            "message": "Tuesday afternoon would be useful. Is the listed S$9,500 the monthly asking rent?",
            "rentalid": null,
            "senderid": 25,
            "listingid": null,
            "messageid": 245,
            "requestid": null,
            "receiverid": 4,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T15:07:00",
            "message": "Yes, that's the monthly asking rent. I'll check my Sunday availability and message you.",
            "rentalid": null,
            "senderid": 4,
            "listingid": null,
            "messageid": 259,
            "requestid": null,
            "receiverid": 25,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-08-31 14:55:00.000",
            "message": "Yes, that's the monthly asking rent. I'll check my Tuesday availability and message you.",
            "rentalid": null,
            "senderid": 4,
            "listingid": null,
            "messageid": 259,
            "requestid": null,
            "receiverid": 25,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 66,
        "tenant_userid": 25,
        "rental_price": 9500,
        "deposit_price": 9500,
        "created_at": "2026-09-02 17:00:00.000",
        "accepted_at": "2026-09-03 18:00:00.000",
        "rental_date": "2026-09-03 18:00:00.000",
        "lease_expiry": "2029-03-03 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 4,
        "receiverid": 25,
        "date": "2026-09-02 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 9500,
          "date": "2026-09-03 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 9500,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 67,
      "ownerid": 5,
      "tenantid": 26,
      "owner_name": "The Flash",
      "tenant_name": "Mei Ling Chan",
      "months": 36,
      "before_listing": {
        "listingid": 67,
        "owneruserid": 5,
        "tenantuserid": null,
        "name": "Ang Mo Kio Four-Bedroom HDB",
        "location": "528 Ang Mo Kio Avenue 10, Ang Mo Kio",
        "price": 7600,
        "flagged": false,
        "created_at": "2026-10-12 06:21:23.816069"
      },
      "after_listing": {
        "listingid": 67,
        "owneruserid": 5,
        "tenantuserid": 26,
        "name": "Ang Mo Kio Four-Bedroom HDB",
        "location": "528 Ang Mo Kio Avenue 10, Ang Mo Kio",
        "price": 7600,
        "flagged": false,
        "created_at": "2025-06-16 18:00:00.000"
      },
      "users": [
        {
          "userid": 5,
          "name": "The Flash",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-06-01 10:00:00"
        },
        {
          "userid": 26,
          "name": "Mei Ling Chan",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-12 11:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T14:36:00",
            "message": "Hello, is the Ang Mo Kio flat available to view? The area would work well for us.",
            "rentalid": null,
            "senderid": 26,
            "listingid": 67,
            "messageid": 220,
            "requestid": null,
            "receiverid": 5,
            "listing_name_snapshot": "Ang Mo Kio Four-Bedroom HDB",
            "listing_address_snapshot": "528 Ang Mo Kio Avenue 10, Ang Mo Kio"
          },
          "after": {
            "date": "2025-06-17 14:20:00.000",
            "message": "Hello, is the Ang Mo Kio flat available to view? The area would work well for us.",
            "rentalid": null,
            "senderid": 26,
            "listingid": 67,
            "messageid": 220,
            "requestid": null,
            "receiverid": 5,
            "listing_name_snapshot": "Ang Mo Kio Four-Bedroom HDB",
            "listing_address_snapshot": "528 Ang Mo Kio Avenue 10, Ang Mo Kio"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T14:40:00",
            "message": "Hi Mei Ling, yes, we can discuss a viewing. When are you looking to move?",
            "rentalid": null,
            "senderid": 5,
            "listingid": null,
            "messageid": 223,
            "requestid": null,
            "receiverid": 26,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-06-17 14:24:00.000",
            "message": "Hi Mei Ling, yes, we can discuss a viewing. When are you looking to move?",
            "rentalid": null,
            "senderid": 5,
            "listingid": null,
            "messageid": 223,
            "requestid": null,
            "receiverid": 26,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T14:47:00",
            "message": "Possibly November. Could we visit on a weekend before discussing the rental terms?",
            "rentalid": null,
            "senderid": 26,
            "listingid": null,
            "messageid": 231,
            "requestid": null,
            "receiverid": 5,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-06-17 14:31:00.000",
            "message": "Possibly in the next few days. Could we visit tomorrow before discussing the rental terms?",
            "rentalid": null,
            "senderid": 26,
            "listingid": null,
            "messageid": 231,
            "requestid": null,
            "receiverid": 5,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T14:54:00",
            "message": "Yes, viewing first is fine. Would Saturday afternoon suit you?",
            "rentalid": null,
            "senderid": 5,
            "listingid": null,
            "messageid": 240,
            "requestid": null,
            "receiverid": 26,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-06-17 14:38:00.000",
            "message": "Yes, viewing first is fine. Would Wednesday afternoon suit you?",
            "rentalid": null,
            "senderid": 5,
            "listingid": null,
            "messageid": 240,
            "requestid": null,
            "receiverid": 26,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T15:02:00",
            "message": "It should. I need to check with the other person who will come with me.",
            "rentalid": null,
            "senderid": 26,
            "listingid": null,
            "messageid": 251,
            "requestid": null,
            "receiverid": 5,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-06-17 14:46:00.000",
            "message": "It should. I need to check with the other person who will come with me.",
            "rentalid": null,
            "senderid": 26,
            "listingid": null,
            "messageid": 251,
            "requestid": null,
            "receiverid": 5,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T15:11:00",
            "message": "Sure, let me know once you've checked and we can settle on a viewing time.",
            "rentalid": null,
            "senderid": 5,
            "listingid": null,
            "messageid": 265,
            "requestid": null,
            "receiverid": 26,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-06-17 14:55:00.000",
            "message": "Sure, let me know once you've checked and we can settle on a viewing time.",
            "rentalid": null,
            "senderid": 5,
            "listingid": null,
            "messageid": 265,
            "requestid": null,
            "receiverid": 26,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 67,
        "tenant_userid": 26,
        "rental_price": 7600,
        "deposit_price": 7600,
        "created_at": "2025-06-19 17:00:00.000",
        "accepted_at": "2025-06-20 18:00:00.000",
        "rental_date": "2025-06-20 18:00:00.000",
        "lease_expiry": "2028-06-20 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 5,
        "receiverid": 26,
        "date": "2025-06-19 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 7600,
          "date": "2025-06-20 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 7600,
          "date": "2025-07-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 7600,
          "date": "2025-08-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 7600,
          "date": "2025-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 7600,
          "date": "2025-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 7600,
          "date": "2025-11-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 7600,
          "date": "2025-12-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 7600,
          "date": "2026-01-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 7600,
          "date": "2026-02-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 7600,
          "date": "2026-03-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 7600,
          "date": "2026-04-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 7600,
          "date": "2026-05-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 7600,
          "date": "2026-06-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 7600,
          "date": "2026-07-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 7600,
          "date": "2026-08-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 7600,
          "date": "2026-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 7600,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 69,
      "ownerid": 6,
      "tenantid": 27,
      "owner_name": "Spiderman",
      "tenant_name": "Farah Abdullah",
      "months": 12,
      "before_listing": {
        "listingid": 69,
        "owneruserid": 6,
        "tenantuserid": null,
        "name": "Sengkang Family Flat",
        "location": "127 Rivervale Street, Sengkang",
        "price": 2800,
        "flagged": false,
        "created_at": "2026-10-12 06:21:23.816069"
      },
      "after_listing": {
        "listingid": 69,
        "owneruserid": 6,
        "tenantuserid": 27,
        "name": "Sengkang Family Flat",
        "location": "127 Rivervale Street, Sengkang",
        "price": 2800,
        "flagged": false,
        "created_at": "2026-09-03 18:00:00.000"
      },
      "users": [
        {
          "userid": 6,
          "name": "Spiderman",
          "role": "USER",
          "flagged": 0,
          "created_at": "2026-08-23 10:00:00"
        },
        {
          "userid": 27,
          "name": "Farah Abdullah",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-15 12:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T14:40:00",
            "message": "Hi, I'm enquiring about the Sengkang flat. Is the listing still current?",
            "rentalid": null,
            "senderid": 27,
            "listingid": 69,
            "messageid": 224,
            "requestid": null,
            "receiverid": 6,
            "listing_name_snapshot": "Sengkang Family Flat",
            "listing_address_snapshot": "127 Rivervale Street, Sengkang"
          },
          "after": {
            "date": "2026-09-04 14:20:00.000",
            "message": "Hi, I'm enquiring about the Sengkang flat. Is the listing still current?",
            "rentalid": null,
            "senderid": 27,
            "listingid": 69,
            "messageid": 224,
            "requestid": null,
            "receiverid": 6,
            "listing_name_snapshot": "Sengkang Family Flat",
            "listing_address_snapshot": "127 Rivervale Street, Sengkang"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T14:44:00",
            "message": "Hi Farah, yes, it is. Are you looking for a place soon?",
            "rentalid": null,
            "senderid": 6,
            "listingid": null,
            "messageid": 227,
            "requestid": null,
            "receiverid": 27,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-04 14:24:00.000",
            "message": "Hi Farah, yes, it is. Are you looking for a place soon?",
            "rentalid": null,
            "senderid": 6,
            "listingid": null,
            "messageid": 227,
            "requestid": null,
            "receiverid": 27,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T14:51:00",
            "message": "I'm hoping for next month. I'm mainly trying to understand the layout at this stage.",
            "rentalid": null,
            "senderid": 27,
            "listingid": null,
            "messageid": 236,
            "requestid": null,
            "receiverid": 6,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-04 14:31:00.000",
            "message": "I'm hoping to move soon. I'm mainly trying to understand the layout at this stage.",
            "rentalid": null,
            "senderid": 27,
            "listingid": null,
            "messageid": 236,
            "requestid": null,
            "receiverid": 6,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T14:58:00",
            "message": "A visit would be the best way to check that. Are evenings convenient?",
            "rentalid": null,
            "senderid": 6,
            "listingid": null,
            "messageid": 246,
            "requestid": null,
            "receiverid": 27,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-04 14:38:00.000",
            "message": "A visit would be the best way to check that. Are evenings convenient?",
            "rentalid": null,
            "senderid": 6,
            "listingid": null,
            "messageid": 246,
            "requestid": null,
            "receiverid": 27,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T15:06:00",
            "message": "Yes, Tuesday or Thursday after work. Could you let me know which is better?",
            "rentalid": null,
            "senderid": 27,
            "listingid": null,
            "messageid": 257,
            "requestid": null,
            "receiverid": 6,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-04 14:46:00.000",
            "message": "Yes, tomorrow after work. Could you let me know which time is better?",
            "rentalid": null,
            "senderid": 27,
            "listingid": null,
            "messageid": 257,
            "requestid": null,
            "receiverid": 6,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T15:15:00",
            "message": "I'll check both evenings and reply here. You can decide after seeing the place.",
            "rentalid": null,
            "senderid": 6,
            "listingid": null,
            "messageid": 271,
            "requestid": null,
            "receiverid": 27,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-04 14:55:00.000",
            "message": "I'll check tomorrow evening and reply here. You can decide after seeing the place.",
            "rentalid": null,
            "senderid": 6,
            "listingid": null,
            "messageid": 271,
            "requestid": null,
            "receiverid": 27,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 69,
        "tenant_userid": 27,
        "rental_price": 2800,
        "deposit_price": 2800,
        "created_at": "2026-09-06 17:00:00.000",
        "accepted_at": "2026-09-07 18:00:00.000",
        "rental_date": "2026-09-07 18:00:00.000",
        "lease_expiry": "2027-09-07 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 6,
        "receiverid": 27,
        "date": "2026-09-06 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 2800,
          "date": "2026-09-07 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 2800,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 71,
      "ownerid": 7,
      "tenantid": 28,
      "owner_name": "Iron Man",
      "tenant_name": "Vikram Rao",
      "months": 27,
      "before_listing": {
        "listingid": 71,
        "owneruserid": 7,
        "tenantuserid": null,
        "name": "Woodlands Compact Flat",
        "location": "301 Woodlands Street 31, Woodlands",
        "price": 2000,
        "flagged": false,
        "created_at": "2026-10-12 06:21:23.816069"
      },
      "after_listing": {
        "listingid": 71,
        "owneruserid": 7,
        "tenantuserid": 28,
        "name": "Woodlands Compact Flat",
        "location": "301 Woodlands Street 31, Woodlands",
        "price": 2000,
        "flagged": false,
        "created_at": "2025-07-04 18:00:00.000"
      },
      "users": [
        {
          "userid": 7,
          "name": "Iron Man",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-06-12 15:30:00"
        },
        {
          "userid": 28,
          "name": "Vikram Rao",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-18 13:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T14:44:00",
            "message": "Hi, is the Woodlands flat still available? My budget is close to the asking rent.",
            "rentalid": null,
            "senderid": 28,
            "listingid": 71,
            "messageid": 228,
            "requestid": null,
            "receiverid": 7,
            "listing_name_snapshot": "Woodlands Compact Flat",
            "listing_address_snapshot": "301 Woodlands Street 31, Woodlands"
          },
          "after": {
            "date": "2025-07-05 14:20:00.000",
            "message": "Hi, is the Woodlands flat still available? My budget is close to the asking rent.",
            "rentalid": null,
            "senderid": 28,
            "listingid": 71,
            "messageid": 228,
            "requestid": null,
            "receiverid": 7,
            "listing_name_snapshot": "Woodlands Compact Flat",
            "listing_address_snapshot": "301 Woodlands Street 31, Woodlands"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T14:48:00",
            "message": "Hi Vikram, yes. The current asking rent is S$2,000 per month.",
            "rentalid": null,
            "senderid": 7,
            "listingid": null,
            "messageid": 232,
            "requestid": null,
            "receiverid": 28,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-07-05 14:24:00.000",
            "message": "Hi Vikram, yes. The current asking rent is S$2,000 per month.",
            "rentalid": null,
            "senderid": 7,
            "listingid": null,
            "messageid": 232,
            "requestid": null,
            "receiverid": 28,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T14:55:00",
            "message": "Thanks. I'd like to view it before committing to anything. Are weekend visits possible?",
            "rentalid": null,
            "senderid": 28,
            "listingid": null,
            "messageid": 242,
            "requestid": null,
            "receiverid": 7,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-07-05 14:31:00.000",
            "message": "Thanks. I'd like to view it before committing to anything. Are daytime visits possible?",
            "rentalid": null,
            "senderid": 28,
            "listingid": null,
            "messageid": 242,
            "requestid": null,
            "receiverid": 7,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T15:02:00",
            "message": "We can try to arrange one. Do you have a preferred day?",
            "rentalid": null,
            "senderid": 7,
            "listingid": null,
            "messageid": 252,
            "requestid": null,
            "receiverid": 28,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-07-05 14:38:00.000",
            "message": "We can try to arrange one. Do you have a preferred day?",
            "rentalid": null,
            "senderid": 7,
            "listingid": null,
            "messageid": 252,
            "requestid": null,
            "receiverid": 28,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T15:10:00",
            "message": "Saturday, ideally before lunch. I can be flexible on the exact time.",
            "rentalid": null,
            "senderid": 28,
            "listingid": null,
            "messageid": 263,
            "requestid": null,
            "receiverid": 7,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-07-05 14:46:00.000",
            "message": "Sunday, ideally before lunch. I can be flexible on the exact time.",
            "rentalid": null,
            "senderid": 28,
            "listingid": null,
            "messageid": 263,
            "requestid": null,
            "receiverid": 7,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T15:19:00",
            "message": "Noted. I'll check a morning slot and confirm it with you first.",
            "rentalid": null,
            "senderid": 7,
            "listingid": null,
            "messageid": 277,
            "requestid": null,
            "receiverid": 28,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-07-05 14:55:00.000",
            "message": "Noted. I'll check a morning slot and confirm it with you first.",
            "rentalid": null,
            "senderid": 7,
            "listingid": null,
            "messageid": 277,
            "requestid": null,
            "receiverid": 28,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 71,
        "tenant_userid": 28,
        "rental_price": 2000,
        "deposit_price": 2000,
        "created_at": "2025-07-07 17:00:00.000",
        "accepted_at": "2025-07-08 18:00:00.000",
        "rental_date": "2025-07-08 18:00:00.000",
        "lease_expiry": "2027-10-08 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 7,
        "receiverid": 28,
        "date": "2025-07-07 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 2000,
          "date": "2025-07-08 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 2000,
          "date": "2025-08-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2000,
          "date": "2025-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2000,
          "date": "2025-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2000,
          "date": "2025-11-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2000,
          "date": "2025-12-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2000,
          "date": "2026-01-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2000,
          "date": "2026-02-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2000,
          "date": "2026-03-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2000,
          "date": "2026-04-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2000,
          "date": "2026-05-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2000,
          "date": "2026-06-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2000,
          "date": "2026-07-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2000,
          "date": "2026-08-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2000,
          "date": "2026-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2000,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 73,
      "ownerid": 8,
      "tenantid": 29,
      "owner_name": "Thor",
      "tenant_name": "Nadia Hassan",
      "months": 21,
      "before_listing": {
        "listingid": 73,
        "owneruserid": 8,
        "tenantuserid": null,
        "name": "Hougang Bright Two-Bedroom Condo",
        "location": "1189 Upper Serangoon Road, Hougang",
        "price": 5200,
        "flagged": false,
        "created_at": "2026-10-12 06:21:23.816069"
      },
      "after_listing": {
        "listingid": 73,
        "owneruserid": 8,
        "tenantuserid": 29,
        "name": "Hougang Bright Two-Bedroom Condo",
        "location": "1189 Upper Serangoon Road, Hougang",
        "price": 5200,
        "flagged": false,
        "created_at": "2026-09-07 18:00:00.000"
      },
      "users": [
        {
          "userid": 8,
          "name": "Thor",
          "role": "USER",
          "flagged": 0,
          "created_at": "2026-08-26 10:00:00"
        },
        {
          "userid": 29,
          "name": "Nadia Hassan",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-21 14:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T14:48:00",
            "message": "Hello, I'd like to enquire about the Hougang condo. Can I arrange a viewing?",
            "rentalid": null,
            "senderid": 29,
            "listingid": 73,
            "messageid": 233,
            "requestid": null,
            "receiverid": 8,
            "listing_name_snapshot": "Hougang Bright Two-Bedroom Condo",
            "listing_address_snapshot": "1189 Upper Serangoon Road, Hougang"
          },
          "after": {
            "date": "2026-09-08 14:20:00.000",
            "message": "Hello, I'd like to enquire about the Hougang condo. Can I arrange a viewing?",
            "rentalid": null,
            "senderid": 29,
            "listingid": 73,
            "messageid": 233,
            "requestid": null,
            "receiverid": 8,
            "listing_name_snapshot": "Hougang Bright Two-Bedroom Condo",
            "listing_address_snapshot": "1189 Upper Serangoon Road, Hougang"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T14:52:00",
            "message": "Hi Nadia, yes. What dates are you considering for a move?",
            "rentalid": null,
            "senderid": 8,
            "listingid": null,
            "messageid": 237,
            "requestid": null,
            "receiverid": 29,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-08 14:24:00.000",
            "message": "Hi Nadia, yes. What dates are you considering for a move?",
            "rentalid": null,
            "senderid": 8,
            "listingid": null,
            "messageid": 237,
            "requestid": null,
            "receiverid": 29,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T14:59:00",
            "message": "Probably sometime in November. I'm comparing locations before settling on one.",
            "rentalid": null,
            "senderid": 29,
            "listingid": null,
            "messageid": 248,
            "requestid": null,
            "receiverid": 8,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-08 14:31:00.000",
            "message": "Probably in the next few days. I'm comparing locations before settling on one.",
            "rentalid": null,
            "senderid": 29,
            "listingid": null,
            "messageid": 248,
            "requestid": null,
            "receiverid": 8,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T15:06:00",
            "message": "That makes sense. Would you prefer an evening or weekend visit?",
            "rentalid": null,
            "senderid": 8,
            "listingid": null,
            "messageid": 258,
            "requestid": null,
            "receiverid": 29,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-08 14:38:00.000",
            "message": "That makes sense. Would you prefer an evening or daytime visit?",
            "rentalid": null,
            "senderid": 8,
            "listingid": null,
            "messageid": 258,
            "requestid": null,
            "receiverid": 29,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T15:14:00",
            "message": "An evening would be better. Could I have time to look at the rooms properly?",
            "rentalid": null,
            "senderid": 29,
            "listingid": null,
            "messageid": 269,
            "requestid": null,
            "receiverid": 8,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-08 14:46:00.000",
            "message": "An evening would be better. Could I have time to look at the rooms properly?",
            "rentalid": null,
            "senderid": 29,
            "listingid": null,
            "messageid": 269,
            "requestid": null,
            "receiverid": 8,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T15:23:00",
            "message": "Certainly. Let's find a time when neither of us needs to rush; I'll check my schedule.",
            "rentalid": null,
            "senderid": 8,
            "listingid": null,
            "messageid": 283,
            "requestid": null,
            "receiverid": 29,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-08 14:55:00.000",
            "message": "Certainly. Let's find a time when neither of us needs to rush; I'll check my schedule.",
            "rentalid": null,
            "senderid": 8,
            "listingid": null,
            "messageid": 283,
            "requestid": null,
            "receiverid": 29,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 73,
        "tenant_userid": 29,
        "rental_price": 5200,
        "deposit_price": 5200,
        "created_at": "2026-09-10 17:00:00.000",
        "accepted_at": "2026-09-11 18:00:00.000",
        "rental_date": "2026-09-11 18:00:00.000",
        "lease_expiry": "2028-06-11 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 8,
        "receiverid": 29,
        "date": "2026-09-10 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 5200,
          "date": "2026-09-11 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 5200,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 75,
      "ownerid": 9,
      "tenantid": 30,
      "owner_name": "Black Widow",
      "tenant_name": "Wei Jie Ng",
      "months": 16,
      "before_listing": {
        "listingid": 75,
        "owneruserid": 9,
        "tenantuserid": null,
        "name": "Holland Two-Bedroom Balcony Condo",
        "location": "12 Holland Hill, Holland",
        "price": 8500,
        "flagged": false,
        "created_at": "2026-10-12 06:21:23.816069"
      },
      "after_listing": {
        "listingid": 75,
        "owneruserid": 9,
        "tenantuserid": 30,
        "name": "Holland Two-Bedroom Balcony Condo",
        "location": "12 Holland Hill, Holland",
        "price": 8500,
        "flagged": false,
        "created_at": "2026-08-29 18:00:00.000"
      },
      "users": [
        {
          "userid": 9,
          "name": "Black Widow",
          "role": "USER",
          "flagged": 0,
          "created_at": "2026-08-22 10:00:00"
        },
        {
          "userid": 30,
          "name": "Wei Jie Ng",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-24 15:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T14:52:00",
            "message": "Hi, I'm interested in the Holland condo. Is it still open for viewings?",
            "rentalid": null,
            "senderid": 30,
            "listingid": 75,
            "messageid": 238,
            "requestid": null,
            "receiverid": 9,
            "listing_name_snapshot": "Holland Two-Bedroom Balcony Condo",
            "listing_address_snapshot": "12 Holland Hill, Holland"
          },
          "after": {
            "date": "2026-08-30 14:20:00.000",
            "message": "Hi, I'm interested in the Holland condo. Is it still open for viewings?",
            "rentalid": null,
            "senderid": 30,
            "listingid": 75,
            "messageid": 238,
            "requestid": null,
            "receiverid": 9,
            "listing_name_snapshot": "Holland Two-Bedroom Balcony Condo",
            "listing_address_snapshot": "12 Holland Hill, Holland"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T14:56:00",
            "message": "Hi Wei Jie, yes. Are you looking on your own or arranging a visit with someone?",
            "rentalid": null,
            "senderid": 9,
            "listingid": null,
            "messageid": 243,
            "requestid": null,
            "receiverid": 30,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-08-30 14:24:00.000",
            "message": "Hi Wei Jie, yes. Are you looking on your own or arranging a visit with someone?",
            "rentalid": null,
            "senderid": 9,
            "listingid": null,
            "messageid": 243,
            "requestid": null,
            "receiverid": 30,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T15:03:00",
            "message": "I'll bring my partner. We'd like to see how the space works before discussing dates.",
            "rentalid": null,
            "senderid": 30,
            "listingid": null,
            "messageid": 254,
            "requestid": null,
            "receiverid": 9,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-08-30 14:31:00.000",
            "message": "I'll bring my partner. We'd like to see how the space works before discussing dates.",
            "rentalid": null,
            "senderid": 30,
            "listingid": null,
            "messageid": 254,
            "requestid": null,
            "receiverid": 9,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T15:10:00",
            "message": "Sure. Which day would work for both of you?",
            "rentalid": null,
            "senderid": 9,
            "listingid": null,
            "messageid": 264,
            "requestid": null,
            "receiverid": 30,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-08-30 14:38:00.000",
            "message": "Sure. Which day would work for both of you?",
            "rentalid": null,
            "senderid": 9,
            "listingid": null,
            "messageid": 264,
            "requestid": null,
            "receiverid": 30,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T15:18:00",
            "message": "Sunday would be easiest. Also, is S$8,500 still the monthly asking price?",
            "rentalid": null,
            "senderid": 30,
            "listingid": null,
            "messageid": 275,
            "requestid": null,
            "receiverid": 9,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-08-30 14:46:00.000",
            "message": "Monday would be easiest. Also, is S$8,500 still the monthly asking price?",
            "rentalid": null,
            "senderid": 30,
            "listingid": null,
            "messageid": 275,
            "requestid": null,
            "receiverid": 9,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T15:27:00",
            "message": "Yes, that's the asking price. Let me check Sunday and suggest a viewing time.",
            "rentalid": null,
            "senderid": 9,
            "listingid": null,
            "messageid": 289,
            "requestid": null,
            "receiverid": 30,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-08-30 14:55:00.000",
            "message": "Yes, that's the asking price. Let me check Monday and suggest a viewing time.",
            "rentalid": null,
            "senderid": 9,
            "listingid": null,
            "messageid": 289,
            "requestid": null,
            "receiverid": 30,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 75,
        "tenant_userid": 30,
        "rental_price": 8500,
        "deposit_price": 8500,
        "created_at": "2026-09-01 17:00:00.000",
        "accepted_at": "2026-09-02 18:00:00.000",
        "rental_date": "2026-09-02 18:00:00.000",
        "lease_expiry": "2028-01-02 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 9,
        "receiverid": 30,
        "date": "2026-09-01 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 8500,
          "date": "2026-09-02 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 8500,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 77,
      "ownerid": 10,
      "tenantid": 31,
      "owner_name": "Captain America",
      "tenant_name": "Olivia Tan",
      "months": 33,
      "before_listing": {
        "listingid": 77,
        "owneruserid": 10,
        "tenantuserid": null,
        "name": "River Valley Compact City Condo",
        "location": "2 Martin Place, River Valley",
        "price": 5400,
        "flagged": false,
        "created_at": "2026-10-12 06:21:23.816069"
      },
      "after_listing": {
        "listingid": 77,
        "owneruserid": 10,
        "tenantuserid": 31,
        "name": "River Valley Compact City Condo",
        "location": "2 Martin Place, River Valley",
        "price": 5400,
        "flagged": false,
        "created_at": "2026-09-11 18:00:00.000"
      },
      "users": [
        {
          "userid": 10,
          "name": "Captain America",
          "role": "USER",
          "flagged": 0,
          "created_at": "2026-08-28 10:00:00"
        },
        {
          "userid": 31,
          "name": "Olivia Tan",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-27 16:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T14:56:00",
            "message": "Hi, may I enquire about the River Valley condo? I'm considering a place in that area.",
            "rentalid": null,
            "senderid": 31,
            "listingid": 77,
            "messageid": 244,
            "requestid": null,
            "receiverid": 10,
            "listing_name_snapshot": "River Valley Compact City Condo",
            "listing_address_snapshot": "2 Martin Place, River Valley"
          },
          "after": {
            "date": "2026-09-12 14:20:00.000",
            "message": "Hi, may I enquire about the River Valley condo? I'm considering a place in that area.",
            "rentalid": null,
            "senderid": 31,
            "listingid": 77,
            "messageid": 244,
            "requestid": null,
            "receiverid": 10,
            "listing_name_snapshot": "River Valley Compact City Condo",
            "listing_address_snapshot": "2 Martin Place, River Valley"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T15:00:00",
            "message": "Hi Olivia, happy to help. When would you like to move?",
            "rentalid": null,
            "senderid": 10,
            "listingid": null,
            "messageid": 249,
            "requestid": null,
            "receiverid": 31,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-12 14:24:00.000",
            "message": "Hi Olivia, happy to help. When would you like to move?",
            "rentalid": null,
            "senderid": 10,
            "listingid": null,
            "messageid": 249,
            "requestid": null,
            "receiverid": 31,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T15:07:00",
            "message": "I'm flexible for now. I own another property, but I'm looking at somewhere different for myself.",
            "rentalid": null,
            "senderid": 31,
            "listingid": null,
            "messageid": 260,
            "requestid": null,
            "receiverid": 10,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-12 14:31:00.000",
            "message": "I'm flexible for now. I own another property, but I'm looking at somewhere different for myself.",
            "rentalid": null,
            "senderid": 31,
            "listingid": null,
            "messageid": 260,
            "requestid": null,
            "receiverid": 10,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T15:14:00",
            "message": "Understood. Would you like to see this place before discussing lease preferences?",
            "rentalid": null,
            "senderid": 10,
            "listingid": null,
            "messageid": 270,
            "requestid": null,
            "receiverid": 31,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-12 14:38:00.000",
            "message": "Understood. Would you like to see this place before discussing lease preferences?",
            "rentalid": null,
            "senderid": 10,
            "listingid": null,
            "messageid": 270,
            "requestid": null,
            "receiverid": 31,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T15:22:00",
            "message": "Yes, please. An evening viewing would help me make a shortlist.",
            "rentalid": null,
            "senderid": 31,
            "listingid": null,
            "messageid": 281,
            "requestid": null,
            "receiverid": 10,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-12 14:46:00.000",
            "message": "Yes, please. An evening viewing would help me make a shortlist.",
            "rentalid": null,
            "senderid": 31,
            "listingid": null,
            "messageid": 281,
            "requestid": null,
            "receiverid": 10,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T15:31:00",
            "message": "Sounds good. Send me a couple of evenings that suit you and I'll check availability.",
            "rentalid": null,
            "senderid": 10,
            "listingid": null,
            "messageid": 295,
            "requestid": null,
            "receiverid": 31,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-12 14:55:00.000",
            "message": "Sounds good. Send me a couple of evenings that suit you and I'll check availability.",
            "rentalid": null,
            "senderid": 10,
            "listingid": null,
            "messageid": 295,
            "requestid": null,
            "receiverid": 31,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 77,
        "tenant_userid": 31,
        "rental_price": 5400,
        "deposit_price": 5400,
        "created_at": "2026-09-14 17:00:00.000",
        "accepted_at": "2026-09-15 18:00:00.000",
        "rental_date": "2026-09-15 18:00:00.000",
        "lease_expiry": "2029-06-15 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 10,
        "receiverid": 31,
        "date": "2026-09-14 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 5400,
          "date": "2026-09-15 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 5400,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 79,
      "ownerid": 11,
      "tenantid": 32,
      "owner_name": "Doctor Strange",
      "tenant_name": "Ravi Kumar",
      "months": 14,
      "before_listing": {
        "listingid": 79,
        "owneruserid": 11,
        "tenantuserid": null,
        "name": "Cosy Ang Mo Kio Apartment - 12",
        "location": "12 ANG MO KIO AVENUE 2, Singapore 567697",
        "price": 8200,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 79,
        "owneruserid": 11,
        "tenantuserid": 32,
        "name": "Cosy Ang Mo Kio Apartment - 12",
        "location": "12 ANG MO KIO AVENUE 2, Singapore 567697",
        "price": 8200,
        "flagged": false,
        "created_at": "2026-09-14 18:00:00.000"
      },
      "users": [
        {
          "userid": 11,
          "name": "Doctor Strange",
          "role": "USER",
          "flagged": 0,
          "created_at": "2026-08-30 10:00:00"
        },
        {
          "userid": 32,
          "name": "Ravi Kumar",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-30 17:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T15:00:00",
            "message": "Hello, is the Ang Mo Kio apartment still available? I'd like to ask about a viewing.",
            "rentalid": null,
            "senderid": 32,
            "listingid": 79,
            "messageid": 250,
            "requestid": null,
            "receiverid": 11,
            "listing_name_snapshot": "Cosy Ang Mo Kio Apartment - 12",
            "listing_address_snapshot": "12 ANG MO KIO AVENUE 2, Singapore 567697"
          },
          "after": {
            "date": "2026-09-15 14:20:00.000",
            "message": "Hello, is the Ang Mo Kio apartment still available? I'd like to ask about a viewing.",
            "rentalid": null,
            "senderid": 32,
            "listingid": 79,
            "messageid": 250,
            "requestid": null,
            "receiverid": 11,
            "listing_name_snapshot": "Cosy Ang Mo Kio Apartment - 12",
            "listing_address_snapshot": "12 ANG MO KIO AVENUE 2, Singapore 567697"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T15:04:00",
            "message": "Hi Ravi, yes, it is. Do you have a move-in month in mind?",
            "rentalid": null,
            "senderid": 11,
            "listingid": null,
            "messageid": 255,
            "requestid": null,
            "receiverid": 32,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-15 14:24:00.000",
            "message": "Hi Ravi, yes, it is. Do you have a move-in month in mind?",
            "rentalid": null,
            "senderid": 11,
            "listingid": null,
            "messageid": 255,
            "requestid": null,
            "receiverid": 32,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T15:11:00",
            "message": "November or December. Is there room to discuss the asking rent after a visit?",
            "rentalid": null,
            "senderid": 32,
            "listingid": null,
            "messageid": 266,
            "requestid": null,
            "receiverid": 11,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-15 14:31:00.000",
            "message": "I'm flexible and could move soon. Is there room to discuss the asking rent after a visit?",
            "rentalid": null,
            "senderid": 32,
            "listingid": null,
            "messageid": 266,
            "requestid": null,
            "receiverid": 11,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T15:18:00",
            "message": "We can discuss your budget after you've seen it. The current asking rent is S$8,200.",
            "rentalid": null,
            "senderid": 11,
            "listingid": null,
            "messageid": 276,
            "requestid": null,
            "receiverid": 32,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-15 14:38:00.000",
            "message": "We can discuss your budget after you've seen it. The current asking rent is S$8,200.",
            "rentalid": null,
            "senderid": 11,
            "listingid": null,
            "messageid": 276,
            "requestid": null,
            "receiverid": 32,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T15:26:00",
            "message": "Understood, I'm just comparing options for now. Would Friday evening be possible?",
            "rentalid": null,
            "senderid": 32,
            "listingid": null,
            "messageid": 287,
            "requestid": null,
            "receiverid": 11,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-15 14:46:00.000",
            "message": "Understood, I'm just comparing options for now. Would Wednesday evening be possible?",
            "rentalid": null,
            "senderid": 32,
            "listingid": null,
            "messageid": 287,
            "requestid": null,
            "receiverid": 11,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T15:35:00",
            "message": "I'll check Friday and let you know. No need to make a decision before the viewing.",
            "rentalid": null,
            "senderid": 11,
            "listingid": null,
            "messageid": 301,
            "requestid": null,
            "receiverid": 32,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-15 14:55:00.000",
            "message": "I'll check Wednesday and let you know. No need to make a decision before the viewing.",
            "rentalid": null,
            "senderid": 11,
            "listingid": null,
            "messageid": 301,
            "requestid": null,
            "receiverid": 32,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 79,
        "tenant_userid": 32,
        "rental_price": 8200,
        "deposit_price": 8200,
        "created_at": "2026-09-17 17:00:00.000",
        "accepted_at": "2026-09-18 18:00:00.000",
        "rental_date": "2026-09-18 18:00:00.000",
        "lease_expiry": "2027-11-18 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 11,
        "receiverid": 32,
        "date": "2026-09-17 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 8200,
          "date": "2026-09-18 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 8200,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 81,
      "ownerid": 12,
      "tenantid": 33,
      "owner_name": "Black Panther",
      "tenant_name": "Grace Chua",
      "months": 26,
      "before_listing": {
        "listingid": 81,
        "owneruserid": 12,
        "tenantuserid": null,
        "name": "Welcoming Bishan Apartment - 63",
        "location": "63 BISHAN STREET 21, Singapore 574045",
        "price": 5700,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 81,
        "owneruserid": 12,
        "tenantuserid": 33,
        "name": "Welcoming Bishan Apartment - 63",
        "location": "63 BISHAN STREET 21, Singapore 574045",
        "price": 5700,
        "flagged": false,
        "created_at": "2026-09-05 18:00:00.000"
      },
      "users": [
        {
          "userid": 12,
          "name": "Black Panther",
          "role": "USER",
          "flagged": 0,
          "created_at": "2026-09-01 10:00:00"
        },
        {
          "userid": 33,
          "name": "Grace Chua",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-06-02 10:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T15:04:00",
            "message": "Hi, I'm looking at the Bishan apartment at 63 Bishan Street 21. Can it be viewed?",
            "rentalid": null,
            "senderid": 33,
            "listingid": 81,
            "messageid": 256,
            "requestid": null,
            "receiverid": 12,
            "listing_name_snapshot": "Welcoming Bishan Apartment - 63",
            "listing_address_snapshot": "63 BISHAN STREET 21, Singapore 574045"
          },
          "after": {
            "date": "2026-09-06 14:20:00.000",
            "message": "Hi, I'm looking at the Bishan apartment at 63 Bishan Street 21. Can it be viewed?",
            "rentalid": null,
            "senderid": 33,
            "listingid": 81,
            "messageid": 256,
            "requestid": null,
            "receiverid": 12,
            "listing_name_snapshot": "Welcoming Bishan Apartment - 63",
            "listing_address_snapshot": "63 BISHAN STREET 21, Singapore 574045"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T15:08:00",
            "message": "Hi Grace, yes. When would you be free to visit?",
            "rentalid": null,
            "senderid": 12,
            "listingid": null,
            "messageid": 261,
            "requestid": null,
            "receiverid": 33,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-06 14:24:00.000",
            "message": "Hi Grace, yes. When would you be free to visit?",
            "rentalid": null,
            "senderid": 12,
            "listingid": null,
            "messageid": 261,
            "requestid": null,
            "receiverid": 33,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T15:15:00",
            "message": "Saturday afternoon, if possible. I'm interested in seeing the actual layout.",
            "rentalid": null,
            "senderid": 33,
            "listingid": null,
            "messageid": 272,
            "requestid": null,
            "receiverid": 12,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-06 14:31:00.000",
            "message": "Monday afternoon, if possible. I'm interested in seeing the actual layout.",
            "rentalid": null,
            "senderid": 33,
            "listingid": null,
            "messageid": 272,
            "requestid": null,
            "receiverid": 12,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T15:22:00",
            "message": "That should be something we can arrange. Are you aiming to move soon?",
            "rentalid": null,
            "senderid": 12,
            "listingid": null,
            "messageid": 282,
            "requestid": null,
            "receiverid": 33,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-06 14:38:00.000",
            "message": "That should be something we can arrange. Are you aiming to move soon?",
            "rentalid": null,
            "senderid": 12,
            "listingid": null,
            "messageid": 282,
            "requestid": null,
            "receiverid": 33,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T15:30:00",
            "message": "Not immediately. I need to give notice on my current place first.",
            "rentalid": null,
            "senderid": 33,
            "listingid": null,
            "messageid": 293,
            "requestid": null,
            "receiverid": 12,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-06 14:46:00.000",
            "message": "My current arrangement is flexible, so I could move soon if the flat suits me.",
            "rentalid": null,
            "senderid": 33,
            "listingid": null,
            "messageid": 293,
            "requestid": null,
            "receiverid": 12,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T15:39:00",
            "message": "Thanks for explaining. Let's start with the viewing and discuss timing after that.",
            "rentalid": null,
            "senderid": 12,
            "listingid": null,
            "messageid": 307,
            "requestid": null,
            "receiverid": 33,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-06 14:55:00.000",
            "message": "Thanks for explaining. Let's start with the viewing and discuss timing after that.",
            "rentalid": null,
            "senderid": 12,
            "listingid": null,
            "messageid": 307,
            "requestid": null,
            "receiverid": 33,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 81,
        "tenant_userid": 33,
        "rental_price": 5700,
        "deposit_price": 5700,
        "created_at": "2026-09-08 17:00:00.000",
        "accepted_at": "2026-09-09 18:00:00.000",
        "rental_date": "2026-09-09 18:00:00.000",
        "lease_expiry": "2028-11-09 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 12,
        "receiverid": 33,
        "date": "2026-09-08 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 5700,
          "date": "2026-09-09 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 5700,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 83,
      "ownerid": 13,
      "tenantid": 34,
      "owner_name": "Aquaman",
      "tenant_name": "Amir Hakim",
      "months": 19,
      "before_listing": {
        "listingid": 83,
        "owneruserid": 13,
        "tenantuserid": null,
        "name": "Bright Bishan Apartment - 31",
        "location": "31 BISHAN STREET 11, Singapore 579819",
        "price": 9800,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 83,
        "owneruserid": 13,
        "tenantuserid": 34,
        "name": "Bright Bishan Apartment - 31",
        "location": "31 BISHAN STREET 11, Singapore 579819",
        "price": 9800,
        "flagged": false,
        "created_at": "2026-09-10 18:00:00.000"
      },
      "users": [
        {
          "userid": 13,
          "name": "Aquaman",
          "role": "USER",
          "flagged": 0,
          "created_at": "2026-09-03 10:00:00"
        },
        {
          "userid": 34,
          "name": "Amir Hakim",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-06-05 11:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T15:08:00",
            "message": "Hi, is the apartment at 31 Bishan Street 11 still available for enquiries?",
            "rentalid": null,
            "senderid": 34,
            "listingid": 83,
            "messageid": 262,
            "requestid": null,
            "receiverid": 13,
            "listing_name_snapshot": "Bright Bishan Apartment - 31",
            "listing_address_snapshot": "31 BISHAN STREET 11, Singapore 579819"
          },
          "after": {
            "date": "2026-09-11 14:20:00.000",
            "message": "Hi, is the apartment at 31 Bishan Street 11 still available for enquiries?",
            "rentalid": null,
            "senderid": 34,
            "listingid": 83,
            "messageid": 262,
            "requestid": null,
            "receiverid": 13,
            "listing_name_snapshot": "Bright Bishan Apartment - 31",
            "listing_address_snapshot": "31 BISHAN STREET 11, Singapore 579819"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T15:12:00",
            "message": "Hi Amir, yes. Are there any details you would like to discuss?",
            "rentalid": null,
            "senderid": 13,
            "listingid": null,
            "messageid": 267,
            "requestid": null,
            "receiverid": 34,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-11 14:24:00.000",
            "message": "Hi Amir, yes. Are there any details you would like to discuss?",
            "rentalid": null,
            "senderid": 13,
            "listingid": null,
            "messageid": 267,
            "requestid": null,
            "receiverid": 34,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T15:19:00",
            "message": "I'm considering a longer stay, but I'd like to see the place before discussing a lease.",
            "rentalid": null,
            "senderid": 34,
            "listingid": null,
            "messageid": 278,
            "requestid": null,
            "receiverid": 13,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-11 14:31:00.000",
            "message": "I'm considering a longer stay, but I'd like to see the place before discussing a lease.",
            "rentalid": null,
            "senderid": 34,
            "listingid": null,
            "messageid": 278,
            "requestid": null,
            "receiverid": 13,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T15:26:00",
            "message": "That's sensible. What viewing times normally work for you?",
            "rentalid": null,
            "senderid": 13,
            "listingid": null,
            "messageid": 288,
            "requestid": null,
            "receiverid": 34,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-11 14:38:00.000",
            "message": "That's sensible. What viewing times normally work for you?",
            "rentalid": null,
            "senderid": 13,
            "listingid": null,
            "messageid": 288,
            "requestid": null,
            "receiverid": 34,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T15:34:00",
            "message": "Weekday evenings after 7 are best. Could I come with one other person?",
            "rentalid": null,
            "senderid": 34,
            "listingid": null,
            "messageid": 299,
            "requestid": null,
            "receiverid": 13,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-11 14:46:00.000",
            "message": "Evenings after 7 are best. Could I come with one other person?",
            "rentalid": null,
            "senderid": 34,
            "listingid": null,
            "messageid": 299,
            "requestid": null,
            "receiverid": 13,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T15:43:00",
            "message": "Yes, let me know your preferred evenings and I'll check a suitable slot for both of you.",
            "rentalid": null,
            "senderid": 13,
            "listingid": null,
            "messageid": 313,
            "requestid": null,
            "receiverid": 34,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-11 14:55:00.000",
            "message": "Yes, let me know your preferred evenings and I'll check a suitable slot for both of you.",
            "rentalid": null,
            "senderid": 13,
            "listingid": null,
            "messageid": 313,
            "requestid": null,
            "receiverid": 34,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 83,
        "tenant_userid": 34,
        "rental_price": 9800,
        "deposit_price": 9800,
        "created_at": "2026-09-13 17:00:00.000",
        "accepted_at": "2026-09-14 18:00:00.000",
        "rental_date": "2026-09-14 18:00:00.000",
        "lease_expiry": "2028-04-14 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 13,
        "receiverid": 34,
        "date": "2026-09-13 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 9800,
          "date": "2026-09-14 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 9800,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 87,
      "ownerid": 15,
      "tenantid": 35,
      "owner_name": "Dobin Kim",
      "tenant_name": "Natalie Wong",
      "months": 31,
      "before_listing": {
        "listingid": 87,
        "owneruserid": 15,
        "tenantuserid": null,
        "name": "Quiet Bishan Flat - 102",
        "location": "102 BISHAN STREET 12, Singapore 570102",
        "price": 4950,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 87,
        "owneruserid": 15,
        "tenantuserid": 35,
        "name": "Quiet Bishan Flat - 102",
        "location": "102 BISHAN STREET 12, Singapore 570102",
        "price": 4950,
        "flagged": false,
        "created_at": "2026-09-17 18:00:00.000"
      },
      "users": [
        {
          "userid": 15,
          "name": "Dobin Kim",
          "role": "USER",
          "flagged": 0,
          "created_at": "2026-09-04 10:00:00"
        },
        {
          "userid": 35,
          "name": "Natalie Wong",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-06-08 12:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T15:12:00",
            "message": "Hello, I'm interested in the Bishan flat at block 102. Is it still available?",
            "rentalid": null,
            "senderid": 35,
            "listingid": 87,
            "messageid": 268,
            "requestid": null,
            "receiverid": 15,
            "listing_name_snapshot": "Quiet Bishan Flat - 102",
            "listing_address_snapshot": "102 BISHAN STREET 12, Singapore 570102"
          },
          "after": {
            "date": "2026-09-18 14:20:00.000",
            "message": "Hello, I'm interested in the Bishan flat at block 102. Is it still available?",
            "rentalid": null,
            "senderid": 35,
            "listingid": 87,
            "messageid": 268,
            "requestid": null,
            "receiverid": 15,
            "listing_name_snapshot": "Quiet Bishan Flat - 102",
            "listing_address_snapshot": "102 BISHAN STREET 12, Singapore 570102"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T15:16:00",
            "message": "Hi Natalie, yes. The current asking rent is S$4,950 a month.",
            "rentalid": null,
            "senderid": 15,
            "listingid": null,
            "messageid": 273,
            "requestid": null,
            "receiverid": 35,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-18 14:24:00.000",
            "message": "Hi Natalie, yes. The current asking rent is S$4,950 a month.",
            "rentalid": null,
            "senderid": 15,
            "listingid": null,
            "messageid": 273,
            "requestid": null,
            "receiverid": 35,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T15:23:00",
            "message": "Thanks. Could we arrange a short viewing this week? I'm comparing nearby flats.",
            "rentalid": null,
            "senderid": 35,
            "listingid": null,
            "messageid": 284,
            "requestid": null,
            "receiverid": 15,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-18 14:31:00.000",
            "message": "Thanks. Could we arrange a short viewing this week? I'm comparing nearby flats.",
            "rentalid": null,
            "senderid": 35,
            "listingid": null,
            "messageid": 284,
            "requestid": null,
            "receiverid": 15,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T15:30:00",
            "message": "Of course. Do you prefer before or after work?",
            "rentalid": null,
            "senderid": 15,
            "listingid": null,
            "messageid": 294,
            "requestid": null,
            "receiverid": 35,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-18 14:38:00.000",
            "message": "Of course. Do you prefer before or after work?",
            "rentalid": null,
            "senderid": 15,
            "listingid": null,
            "messageid": 294,
            "requestid": null,
            "receiverid": 35,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T15:38:00",
            "message": "After work would be much better. Thursday is my least busy day.",
            "rentalid": null,
            "senderid": 35,
            "listingid": null,
            "messageid": 305,
            "requestid": null,
            "receiverid": 15,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-18 14:46:00.000",
            "message": "After work would be much better. Saturday is my least busy day.",
            "rentalid": null,
            "senderid": 35,
            "listingid": null,
            "messageid": 305,
            "requestid": null,
            "receiverid": 15,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T15:47:00",
            "message": "I'll check Thursday evening and get back to you before we confirm anything.",
            "rentalid": null,
            "senderid": 15,
            "listingid": null,
            "messageid": 319,
            "requestid": null,
            "receiverid": 35,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-18 14:55:00.000",
            "message": "I'll check Saturday evening and get back to you before we confirm anything.",
            "rentalid": null,
            "senderid": 15,
            "listingid": null,
            "messageid": 319,
            "requestid": null,
            "receiverid": 35,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 87,
        "tenant_userid": 35,
        "rental_price": 4950,
        "deposit_price": 4950,
        "created_at": "2026-09-20 17:00:00.000",
        "accepted_at": "2026-09-21 18:00:00.000",
        "rental_date": "2026-09-21 18:00:00.000",
        "lease_expiry": "2029-04-21 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 15,
        "receiverid": 35,
        "date": "2026-09-20 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 4950,
          "date": "2026-09-21 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 4950,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 89,
      "ownerid": 16,
      "tenantid": 36,
      "owner_name": "Daniel Tan",
      "tenant_name": "Ryan Low",
      "months": 13,
      "before_listing": {
        "listingid": 89,
        "owneruserid": 16,
        "tenantuserid": null,
        "name": "Cosy Bishan Flat - 104",
        "location": "104 BISHAN STREET 12, Singapore 570104",
        "price": 3500,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 89,
        "owneruserid": 16,
        "tenantuserid": 36,
        "name": "Cosy Bishan Flat - 104",
        "location": "104 BISHAN STREET 12, Singapore 570104",
        "price": 3500,
        "flagged": false,
        "created_at": "2026-09-12 18:00:00.000"
      },
      "users": [
        {
          "userid": 16,
          "name": "Daniel Tan",
          "role": "USER",
          "flagged": 0,
          "created_at": "2026-09-05 10:00:00"
        },
        {
          "userid": 36,
          "name": "Ryan Low",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-06-11 13:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T15:16:00",
            "message": "Hi, can I enquire about the Bishan flat at block 104? I'm looking for a new place.",
            "rentalid": null,
            "senderid": 36,
            "listingid": 89,
            "messageid": 274,
            "requestid": null,
            "receiverid": 16,
            "listing_name_snapshot": "Cosy Bishan Flat - 104",
            "listing_address_snapshot": "104 BISHAN STREET 12, Singapore 570104"
          },
          "after": {
            "date": "2026-09-13 14:20:00.000",
            "message": "Hi, can I enquire about the Bishan flat at block 104? I'm looking for a new place.",
            "rentalid": null,
            "senderid": 36,
            "listingid": 89,
            "messageid": 274,
            "requestid": null,
            "receiverid": 16,
            "listing_name_snapshot": "Cosy Bishan Flat - 104",
            "listing_address_snapshot": "104 BISHAN STREET 12, Singapore 570104"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T15:20:00",
            "message": "Hi Ryan, yes. What move-in period are you considering?",
            "rentalid": null,
            "senderid": 16,
            "listingid": null,
            "messageid": 279,
            "requestid": null,
            "receiverid": 36,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-13 14:24:00.000",
            "message": "Hi Ryan, yes. What move-in period are you considering?",
            "rentalid": null,
            "senderid": 16,
            "listingid": null,
            "messageid": 279,
            "requestid": null,
            "receiverid": 36,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T15:27:00",
            "message": "Early December. I would like to see the flat before deciding whether to shortlist it.",
            "rentalid": null,
            "senderid": 36,
            "listingid": null,
            "messageid": 290,
            "requestid": null,
            "receiverid": 16,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-13 14:31:00.000",
            "message": "In the next few days if it works out. I would like to see the flat before deciding whether to shortlist it.",
            "rentalid": null,
            "senderid": 36,
            "listingid": null,
            "messageid": 290,
            "requestid": null,
            "receiverid": 16,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T15:34:00",
            "message": "That's fine. Would a weekend viewing work for you?",
            "rentalid": null,
            "senderid": 16,
            "listingid": null,
            "messageid": 300,
            "requestid": null,
            "receiverid": 36,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-13 14:38:00.000",
            "message": "That's fine. Would a daytime viewing work for you?",
            "rentalid": null,
            "senderid": 16,
            "listingid": null,
            "messageid": 300,
            "requestid": null,
            "receiverid": 36,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T15:42:00",
            "message": "Yes, Saturday morning would be ideal. Is the asking rent still S$3,500?",
            "rentalid": null,
            "senderid": 36,
            "listingid": null,
            "messageid": 311,
            "requestid": null,
            "receiverid": 16,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-13 14:46:00.000",
            "message": "Yes, Monday morning would be ideal. Is the asking rent still S$3,500?",
            "rentalid": null,
            "senderid": 36,
            "listingid": null,
            "messageid": 311,
            "requestid": null,
            "receiverid": 16,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T15:51:00",
            "message": "Yes, per month. I'll check Saturday morning and suggest a time.",
            "rentalid": null,
            "senderid": 16,
            "listingid": null,
            "messageid": 325,
            "requestid": null,
            "receiverid": 36,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-13 14:55:00.000",
            "message": "Yes, per month. I'll check Monday morning and suggest a time.",
            "rentalid": null,
            "senderid": 16,
            "listingid": null,
            "messageid": 325,
            "requestid": null,
            "receiverid": 36,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 89,
        "tenant_userid": 36,
        "rental_price": 3500,
        "deposit_price": 3500,
        "created_at": "2026-09-15 17:00:00.000",
        "accepted_at": "2026-09-16 18:00:00.000",
        "rental_date": "2026-09-16 18:00:00.000",
        "lease_expiry": "2027-10-16 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 16,
        "receiverid": 36,
        "date": "2026-09-15 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 3500,
          "date": "2026-09-16 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 3500,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 90,
      "ownerid": 16,
      "tenantid": 37,
      "owner_name": "Daniel Tan",
      "tenant_name": "Ananya Sharma",
      "months": 28,
      "before_listing": {
        "listingid": 90,
        "owneruserid": 16,
        "tenantuserid": null,
        "name": "Spacious Orchard / Oxley Apartment - 19",
        "location": "19 OXLEY ROAD, Singapore 238619",
        "price": 17500,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 90,
        "owneruserid": 16,
        "tenantuserid": 37,
        "name": "Spacious Orchard / Oxley Apartment - 19",
        "location": "19 OXLEY ROAD, Singapore 238619",
        "price": 17500,
        "flagged": false,
        "created_at": "2026-09-20 18:00:00.000"
      },
      "users": [
        {
          "userid": 16,
          "name": "Daniel Tan",
          "role": "USER",
          "flagged": 0,
          "created_at": "2026-09-05 10:00:00"
        },
        {
          "userid": 37,
          "name": "Ananya Sharma",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-11 14:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T15:20:00",
            "message": "Hello, I'm interested in viewing the apartment at 19 Oxley Road. Is it available?",
            "rentalid": null,
            "senderid": 37,
            "listingid": 90,
            "messageid": 280,
            "requestid": null,
            "receiverid": 16,
            "listing_name_snapshot": "Spacious Orchard / Oxley Apartment - 19",
            "listing_address_snapshot": "19 OXLEY ROAD, Singapore 238619"
          },
          "after": {
            "date": "2026-09-21 14:20:00.000",
            "message": "Hello, I'm interested in viewing the apartment at 19 Oxley Road. Is it available?",
            "rentalid": null,
            "senderid": 37,
            "listingid": 90,
            "messageid": 280,
            "requestid": null,
            "receiverid": 16,
            "listing_name_snapshot": "Spacious Orchard / Oxley Apartment - 19",
            "listing_address_snapshot": "19 OXLEY ROAD, Singapore 238619"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T15:24:00",
            "message": "Hi Ananya, yes, it is available for enquiries. When would you like to visit?",
            "rentalid": null,
            "senderid": 16,
            "listingid": null,
            "messageid": 285,
            "requestid": null,
            "receiverid": 37,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-21 14:24:00.000",
            "message": "Hi Ananya, yes, it is available for enquiries. When would you like to visit?",
            "rentalid": null,
            "senderid": 16,
            "listingid": null,
            "messageid": 285,
            "requestid": null,
            "receiverid": 37,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T15:31:00",
            "message": "Next week would be good. I want to compare it with another apartment before deciding.",
            "rentalid": null,
            "senderid": 37,
            "listingid": null,
            "messageid": 296,
            "requestid": null,
            "receiverid": 16,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-21 14:31:00.000",
            "message": "Tomorrow would be good. I want to compare it with another apartment before deciding.",
            "rentalid": null,
            "senderid": 37,
            "listingid": null,
            "messageid": 296,
            "requestid": null,
            "receiverid": 16,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T15:38:00",
            "message": "No problem. Is an evening visit or a daytime visit better for you?",
            "rentalid": null,
            "senderid": 16,
            "listingid": null,
            "messageid": 306,
            "requestid": null,
            "receiverid": 37,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-21 14:38:00.000",
            "message": "No problem. Is an evening visit or a daytime visit better for you?",
            "rentalid": null,
            "senderid": 16,
            "listingid": null,
            "messageid": 306,
            "requestid": null,
            "receiverid": 37,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T15:46:00",
            "message": "Daytime if possible. I would like to get a feel for the rooms in natural light.",
            "rentalid": null,
            "senderid": 37,
            "listingid": null,
            "messageid": 317,
            "requestid": null,
            "receiverid": 16,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-21 14:46:00.000",
            "message": "Daytime if possible. I would like to get a feel for the rooms in natural light.",
            "rentalid": null,
            "senderid": 37,
            "listingid": null,
            "messageid": 317,
            "requestid": null,
            "receiverid": 16,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T15:55:00",
            "message": "Understood. Send me two daytime slots and I'll see which one I can arrange.",
            "rentalid": null,
            "senderid": 16,
            "listingid": null,
            "messageid": 331,
            "requestid": null,
            "receiverid": 37,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-21 14:55:00.000",
            "message": "Understood. Send me two daytime slots and I'll see which one I can arrange.",
            "rentalid": null,
            "senderid": 16,
            "listingid": null,
            "messageid": 331,
            "requestid": null,
            "receiverid": 37,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 90,
        "tenant_userid": 37,
        "rental_price": 17500,
        "deposit_price": 17500,
        "created_at": "2026-09-23 17:00:00.000",
        "accepted_at": "2026-09-24 18:00:00.000",
        "rental_date": "2026-09-24 18:00:00.000",
        "lease_expiry": "2029-01-24 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 16,
        "receiverid": 37,
        "date": "2026-09-23 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 17500,
          "date": "2026-09-24 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 17500,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 91,
      "ownerid": 17,
      "tenantid": 38,
      "owner_name": "Sarah Lim",
      "tenant_name": "Jia Min Tay",
      "months": 22,
      "before_listing": {
        "listingid": 91,
        "owneruserid": 17,
        "tenantuserid": null,
        "name": "Welcoming Orchard / Oxley Apartment - 27",
        "location": "27 OXLEY ROAD, Singapore 238621",
        "price": 20000,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 91,
        "owneruserid": 17,
        "tenantuserid": 38,
        "name": "Welcoming Orchard / Oxley Apartment - 27",
        "location": "27 OXLEY ROAD, Singapore 238621",
        "price": 20000,
        "flagged": false,
        "created_at": "2026-09-24 18:00:00.000"
      },
      "users": [
        {
          "userid": 17,
          "name": "Sarah Lim",
          "role": "USER",
          "flagged": 0,
          "created_at": "2026-09-07 10:00:00"
        },
        {
          "userid": 38,
          "name": "Jia Min Tay",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-14 15:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T15:24:00",
            "message": "Hi, I'd like to enquire about the apartment at 27 Oxley Road. Can we arrange a visit?",
            "rentalid": null,
            "senderid": 38,
            "listingid": 91,
            "messageid": 286,
            "requestid": null,
            "receiverid": 17,
            "listing_name_snapshot": "Welcoming Orchard / Oxley Apartment - 27",
            "listing_address_snapshot": "27 OXLEY ROAD, Singapore 238621"
          },
          "after": {
            "date": "2026-09-25 14:20:00.000",
            "message": "Hi, I'd like to enquire about the apartment at 27 Oxley Road. Can we arrange a visit?",
            "rentalid": null,
            "senderid": 38,
            "listingid": 91,
            "messageid": 286,
            "requestid": null,
            "receiverid": 17,
            "listing_name_snapshot": "Welcoming Orchard / Oxley Apartment - 27",
            "listing_address_snapshot": "27 OXLEY ROAD, Singapore 238621"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T15:28:00",
            "message": "Hi Jia Min, yes. Do you have a particular budget or move-in period in mind?",
            "rentalid": null,
            "senderid": 17,
            "listingid": null,
            "messageid": 291,
            "requestid": null,
            "receiverid": 38,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-25 14:24:00.000",
            "message": "Hi Jia Min, yes. Do you have a particular budget or move-in period in mind?",
            "rentalid": null,
            "senderid": 17,
            "listingid": null,
            "messageid": 291,
            "requestid": null,
            "receiverid": 38,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T15:35:00",
            "message": "I'm still narrowing things down. I saw the monthly rent listed as S$20,000; is that current?",
            "rentalid": null,
            "senderid": 38,
            "listingid": null,
            "messageid": 302,
            "requestid": null,
            "receiverid": 17,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-25 14:31:00.000",
            "message": "I'm still narrowing things down. I saw the monthly rent listed as S$20,000; is that current?",
            "rentalid": null,
            "senderid": 38,
            "listingid": null,
            "messageid": 302,
            "requestid": null,
            "receiverid": 17,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T15:42:00",
            "message": "Yes, that's the current asking rent. It's fine to view before deciding whether it suits you.",
            "rentalid": null,
            "senderid": 17,
            "listingid": null,
            "messageid": 312,
            "requestid": null,
            "receiverid": 38,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-25 14:38:00.000",
            "message": "Yes, that's the current asking rent. It's fine to view before deciding whether it suits you.",
            "rentalid": null,
            "senderid": 17,
            "listingid": null,
            "messageid": 312,
            "requestid": null,
            "receiverid": 38,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T15:50:00",
            "message": "Thank you. Could I check the layout in person on a weekend?",
            "rentalid": null,
            "senderid": 38,
            "listingid": null,
            "messageid": 323,
            "requestid": null,
            "receiverid": 17,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-25 14:46:00.000",
            "message": "Thank you. Could I check the layout in person tomorrow?",
            "rentalid": null,
            "senderid": 38,
            "listingid": null,
            "messageid": 323,
            "requestid": null,
            "receiverid": 17,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T15:59:00",
            "message": "Certainly. Let me check my weekend availability and come back with some options.",
            "rentalid": null,
            "senderid": 17,
            "listingid": null,
            "messageid": 337,
            "requestid": null,
            "receiverid": 38,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-09-25 14:55:00.000",
            "message": "Certainly. Let me check my availability tomorrow and come back with some options.",
            "rentalid": null,
            "senderid": 17,
            "listingid": null,
            "messageid": 337,
            "requestid": null,
            "receiverid": 38,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 91,
        "tenant_userid": 38,
        "rental_price": 20000,
        "deposit_price": 20000,
        "created_at": "2026-09-27 17:00:00.000",
        "accepted_at": "2026-09-28 18:00:00.000",
        "rental_date": "2026-09-28 18:00:00.000",
        "lease_expiry": "2028-07-28 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 17,
        "receiverid": 38,
        "date": "2026-09-27 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 20000,
          "date": "2026-09-28 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 20000,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 93,
      "ownerid": 18,
      "tenantid": 39,
      "owner_name": "Marcus Lee",
      "tenant_name": "Darren Yeo",
      "months": 17,
      "before_listing": {
        "listingid": 93,
        "owneruserid": 18,
        "tenantuserid": null,
        "name": "Bright Jurong West Flat - 474",
        "location": "474 JURONG WEST STREET 41, Singapore 640474",
        "price": 4350,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 93,
        "owneruserid": 18,
        "tenantuserid": 39,
        "name": "Bright Jurong West Flat - 474",
        "location": "474 JURONG WEST STREET 41, Singapore 640474",
        "price": 4350,
        "flagged": false,
        "created_at": "2026-10-06 18:00:00.000"
      },
      "users": [
        {
          "userid": 18,
          "name": "Marcus Lee",
          "role": "USER",
          "flagged": 0,
          "created_at": "2026-10-05 19:08:40.851006"
        },
        {
          "userid": 39,
          "name": "Darren Yeo",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-17 16:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T15:28:00",
            "message": "Hi, is the Jurong West flat at block 474 still available?",
            "rentalid": null,
            "senderid": 39,
            "listingid": 93,
            "messageid": 292,
            "requestid": null,
            "receiverid": 18,
            "listing_name_snapshot": "Bright Jurong West Flat - 474",
            "listing_address_snapshot": "474 JURONG WEST STREET 41, Singapore 640474"
          },
          "after": {
            "date": "2026-10-07 14:20:00.000",
            "message": "Hi, is the Jurong West flat at block 474 still available?",
            "rentalid": null,
            "senderid": 39,
            "listingid": 93,
            "messageid": 292,
            "requestid": null,
            "receiverid": 18,
            "listing_name_snapshot": "Bright Jurong West Flat - 474",
            "listing_address_snapshot": "474 JURONG WEST STREET 41, Singapore 640474"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T15:32:00",
            "message": "Hi Darren, yes. Are you hoping to move in soon?",
            "rentalid": null,
            "senderid": 18,
            "listingid": null,
            "messageid": 297,
            "requestid": null,
            "receiverid": 39,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-10-07 14:24:00.000",
            "message": "Hi Darren, yes. Are you hoping to move in soon?",
            "rentalid": null,
            "senderid": 18,
            "listingid": null,
            "messageid": 297,
            "requestid": null,
            "receiverid": 39,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T15:39:00",
            "message": "Possibly next month. I'd like to check the flat before discussing the rental period.",
            "rentalid": null,
            "senderid": 39,
            "listingid": null,
            "messageid": 308,
            "requestid": null,
            "receiverid": 18,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-10-07 14:31:00.000",
            "message": "Possibly in the next few days. I'd like to check the flat before discussing the rental period.",
            "rentalid": null,
            "senderid": 39,
            "listingid": null,
            "messageid": 308,
            "requestid": null,
            "receiverid": 18,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T15:46:00",
            "message": "Sure. Would an evening viewing be convenient?",
            "rentalid": null,
            "senderid": 18,
            "listingid": null,
            "messageid": 318,
            "requestid": null,
            "receiverid": 39,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-10-07 14:38:00.000",
            "message": "Sure. Would an evening viewing be convenient?",
            "rentalid": null,
            "senderid": 18,
            "listingid": null,
            "messageid": 318,
            "requestid": null,
            "receiverid": 39,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T15:54:00",
            "message": "Yes, Wednesday after 6.30 would be good. Could we keep that tentative for now?",
            "rentalid": null,
            "senderid": 39,
            "listingid": null,
            "messageid": 329,
            "requestid": null,
            "receiverid": 18,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-10-07 14:46:00.000",
            "message": "Yes, Thursday after 6.30 would be good. Could we keep that tentative for now?",
            "rentalid": null,
            "senderid": 39,
            "listingid": null,
            "messageid": 329,
            "requestid": null,
            "receiverid": 18,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T16:03:00",
            "message": "Yes, I'll check on my side too and confirm here before the viewing.",
            "rentalid": null,
            "senderid": 18,
            "listingid": null,
            "messageid": 343,
            "requestid": null,
            "receiverid": 39,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-10-07 14:55:00.000",
            "message": "Yes, I'll check on my side too and confirm here before the viewing.",
            "rentalid": null,
            "senderid": 18,
            "listingid": null,
            "messageid": 343,
            "requestid": null,
            "receiverid": 39,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 93,
        "tenant_userid": 39,
        "rental_price": 4350,
        "deposit_price": 4350,
        "created_at": "2026-10-09 17:00:00.000",
        "accepted_at": "2026-10-10 18:00:00.000",
        "rental_date": "2026-10-10 18:00:00.000",
        "lease_expiry": "2028-03-10 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 18,
        "receiverid": 39,
        "date": "2026-10-09 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 4350,
          "date": "2026-10-10 17:59:59.000",
          "convention": "initial_simulated_payment"
        }
      ]
    },
    {
      "listingid": 95,
      "ownerid": 21,
      "tenantid": 40,
      "owner_name": "Sophie Lee",
      "tenant_name": "Hannah Lim",
      "months": 25,
      "before_listing": {
        "listingid": 95,
        "owneruserid": 21,
        "tenantuserid": null,
        "name": "Spacious Jurong West Flat - 476",
        "location": "476 JURONG WEST STREET 41, Singapore 640476",
        "price": 4750,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 95,
        "owneruserid": 21,
        "tenantuserid": 40,
        "name": "Spacious Jurong West Flat - 476",
        "location": "476 JURONG WEST STREET 41, Singapore 640476",
        "price": 4750,
        "flagged": false,
        "created_at": "2025-09-05 18:00:00.000"
      },
      "users": [
        {
          "userid": 21,
          "name": "Sophie Lee",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-08-12 19:10:00"
        },
        {
          "userid": 40,
          "name": "Hannah Lim",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-20 17:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T15:32:00",
            "message": "Hello, I'm enquiring about the flat at block 476 Jurong West. Are viewings possible?",
            "rentalid": null,
            "senderid": 40,
            "listingid": 95,
            "messageid": 298,
            "requestid": null,
            "receiverid": 21,
            "listing_name_snapshot": "Spacious Jurong West Flat - 476",
            "listing_address_snapshot": "476 JURONG WEST STREET 41, Singapore 640476"
          },
          "after": {
            "date": "2025-09-06 14:20:00.000",
            "message": "Hello, I'm enquiring about the flat at block 476 Jurong West. Are viewings possible?",
            "rentalid": null,
            "senderid": 40,
            "listingid": 95,
            "messageid": 298,
            "requestid": null,
            "receiverid": 21,
            "listing_name_snapshot": "Spacious Jurong West Flat - 476",
            "listing_address_snapshot": "476 JURONG WEST STREET 41, Singapore 640476"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T15:36:00",
            "message": "Hi Hannah, yes. What days are you normally free?",
            "rentalid": null,
            "senderid": 21,
            "listingid": null,
            "messageid": 303,
            "requestid": null,
            "receiverid": 40,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-09-06 14:24:00.000",
            "message": "Hi Hannah, yes. What days are you normally free?",
            "rentalid": null,
            "senderid": 21,
            "listingid": null,
            "messageid": 303,
            "requestid": null,
            "receiverid": 40,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T15:43:00",
            "message": "Mostly Sundays. I'm looking with a family member, so we need to coordinate.",
            "rentalid": null,
            "senderid": 40,
            "listingid": null,
            "messageid": 314,
            "requestid": null,
            "receiverid": 21,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-09-06 14:31:00.000",
            "message": "Mostly Sundays. I'm looking with a family member, so we need to coordinate.",
            "rentalid": null,
            "senderid": 40,
            "listingid": null,
            "messageid": 314,
            "requestid": null,
            "receiverid": 21,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T15:50:00",
            "message": "Understood. We can look for a Sunday slot that gives you both enough time.",
            "rentalid": null,
            "senderid": 21,
            "listingid": null,
            "messageid": 324,
            "requestid": null,
            "receiverid": 40,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-09-06 14:38:00.000",
            "message": "Understood. We can look for a Sunday slot that gives you both enough time.",
            "rentalid": null,
            "senderid": 21,
            "listingid": null,
            "messageid": 324,
            "requestid": null,
            "receiverid": 40,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T15:58:00",
            "message": "Thanks. Is the monthly asking rent still S$4,750 as shown?",
            "rentalid": null,
            "senderid": 40,
            "listingid": null,
            "messageid": 335,
            "requestid": null,
            "receiverid": 21,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-09-06 14:46:00.000",
            "message": "Thanks. Is the monthly asking rent still S$4,750 as shown?",
            "rentalid": null,
            "senderid": 40,
            "listingid": null,
            "messageid": 335,
            "requestid": null,
            "receiverid": 21,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T16:07:00",
            "message": "Yes, that's correct. Let me know whether morning or afternoon works better for you.",
            "rentalid": null,
            "senderid": 21,
            "listingid": null,
            "messageid": 349,
            "requestid": null,
            "receiverid": 40,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-09-06 14:55:00.000",
            "message": "Yes, that's correct. Let me know whether morning or afternoon works better for you.",
            "rentalid": null,
            "senderid": 21,
            "listingid": null,
            "messageid": 349,
            "requestid": null,
            "receiverid": 40,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 95,
        "tenant_userid": 40,
        "rental_price": 4750,
        "deposit_price": 4750,
        "created_at": "2025-09-08 17:00:00.000",
        "accepted_at": "2025-09-09 18:00:00.000",
        "rental_date": "2025-09-09 18:00:00.000",
        "lease_expiry": "2027-10-09 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 21,
        "receiverid": 40,
        "date": "2025-09-08 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 4750,
          "date": "2025-09-09 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 4750,
          "date": "2025-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4750,
          "date": "2025-11-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4750,
          "date": "2025-12-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4750,
          "date": "2026-01-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4750,
          "date": "2026-02-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4750,
          "date": "2026-03-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4750,
          "date": "2026-04-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4750,
          "date": "2026-05-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4750,
          "date": "2026-06-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4750,
          "date": "2026-07-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4750,
          "date": "2026-08-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4750,
          "date": "2026-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4750,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 97,
      "ownerid": 22,
      "tenantid": 41,
      "owner_name": "Marcus Ho",
      "tenant_name": "Zahir Osman",
      "months": 20,
      "before_listing": {
        "listingid": 97,
        "owneruserid": 22,
        "tenantuserid": null,
        "name": "Quiet Jurong West Flat - 478",
        "location": "478 JURONG WEST STREET 41, Singapore 640478",
        "price": 3700,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 97,
        "owneruserid": 22,
        "tenantuserid": 41,
        "name": "Quiet Jurong West Flat - 478",
        "location": "478 JURONG WEST STREET 41, Singapore 640478",
        "price": 3700,
        "flagged": false,
        "created_at": "2026-05-02 18:00:00.000"
      },
      "users": [
        {
          "userid": 22,
          "name": "Marcus Ho",
          "role": "USER",
          "flagged": 0,
          "created_at": "2026-03-15 12:20:00"
        },
        {
          "userid": 41,
          "name": "Zahir Osman",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-23 10:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T15:36:00",
            "message": "Hi, is the flat at block 478 Jurong West still open for enquiries?",
            "rentalid": null,
            "senderid": 41,
            "listingid": 97,
            "messageid": 304,
            "requestid": null,
            "receiverid": 22,
            "listing_name_snapshot": "Quiet Jurong West Flat - 478",
            "listing_address_snapshot": "478 JURONG WEST STREET 41, Singapore 640478"
          },
          "after": {
            "date": "2026-05-03 14:20:00.000",
            "message": "Hi, is the flat at block 478 Jurong West still open for enquiries?",
            "rentalid": null,
            "senderid": 41,
            "listingid": 97,
            "messageid": 304,
            "requestid": null,
            "receiverid": 22,
            "listing_name_snapshot": "Quiet Jurong West Flat - 478",
            "listing_address_snapshot": "478 JURONG WEST STREET 41, Singapore 640478"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T15:40:00",
            "message": "Hi Zahir, it is. What would you like to check?",
            "rentalid": null,
            "senderid": 22,
            "listingid": null,
            "messageid": 309,
            "requestid": null,
            "receiverid": 41,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-05-03 14:24:00.000",
            "message": "Hi Zahir, it is. What would you like to check?",
            "rentalid": null,
            "senderid": 22,
            "listingid": null,
            "messageid": 309,
            "requestid": null,
            "receiverid": 41,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T15:47:00",
            "message": "I'm interested in the location. Could I visit first and discuss lease length afterwards?",
            "rentalid": null,
            "senderid": 41,
            "listingid": null,
            "messageid": 320,
            "requestid": null,
            "receiverid": 22,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-05-03 14:31:00.000",
            "message": "I'm interested in the location. Could I visit first and discuss lease length afterwards?",
            "rentalid": null,
            "senderid": 41,
            "listingid": null,
            "messageid": 320,
            "requestid": null,
            "receiverid": 22,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T15:54:00",
            "message": "Yes, that is fine. When would you be available?",
            "rentalid": null,
            "senderid": 22,
            "listingid": null,
            "messageid": 330,
            "requestid": null,
            "receiverid": 41,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-05-03 14:38:00.000",
            "message": "Yes, that is fine. When would you be available?",
            "rentalid": null,
            "senderid": 22,
            "listingid": null,
            "messageid": 330,
            "requestid": null,
            "receiverid": 41,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T16:02:00",
            "message": "Friday after work would suit me, but I can also do Saturday.",
            "rentalid": null,
            "senderid": 41,
            "listingid": null,
            "messageid": 341,
            "requestid": null,
            "receiverid": 22,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-05-03 14:46:00.000",
            "message": "Tomorrow after work would suit me, but I can also do earlier in the day.",
            "rentalid": null,
            "senderid": 41,
            "listingid": null,
            "messageid": 341,
            "requestid": null,
            "receiverid": 22,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T16:11:00",
            "message": "I'll check those two options and send you a proposed viewing time.",
            "rentalid": null,
            "senderid": 22,
            "listingid": null,
            "messageid": 355,
            "requestid": null,
            "receiverid": 41,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-05-03 14:55:00.000",
            "message": "I'll check those two options and send you a proposed viewing time.",
            "rentalid": null,
            "senderid": 22,
            "listingid": null,
            "messageid": 355,
            "requestid": null,
            "receiverid": 41,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 97,
        "tenant_userid": 41,
        "rental_price": 3700,
        "deposit_price": 3700,
        "created_at": "2026-05-05 17:00:00.000",
        "accepted_at": "2026-05-06 18:00:00.000",
        "rental_date": "2026-05-06 18:00:00.000",
        "lease_expiry": "2028-01-06 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 22,
        "receiverid": 41,
        "date": "2026-05-05 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 3700,
          "date": "2026-05-06 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 3700,
          "date": "2026-06-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3700,
          "date": "2026-07-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3700,
          "date": "2026-08-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3700,
          "date": "2026-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3700,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 99,
      "ownerid": 23,
      "tenantid": 42,
      "owner_name": "Divya Krishnan",
      "tenant_name": "Isabelle Tan",
      "months": 32,
      "before_listing": {
        "listingid": 99,
        "owneruserid": 23,
        "tenantuserid": null,
        "name": "Cosy Jurong West Flat - 480",
        "location": "480 JURONG WEST STREET 41, Singapore 640480",
        "price": 3100,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 99,
        "owneruserid": 23,
        "tenantuserid": 42,
        "name": "Cosy Jurong West Flat - 480",
        "location": "480 JURONG WEST STREET 41, Singapore 640480",
        "price": 3100,
        "flagged": false,
        "created_at": "2025-08-03 18:00:00.000"
      },
      "users": [
        {
          "userid": 23,
          "name": "Divya Krishnan",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-07-02 10:00:00"
        },
        {
          "userid": 42,
          "name": "Isabelle Tan",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-26 11:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T15:40:00",
            "message": "Hello, I'm interested in the flat at block 480. Could we discuss a viewing?",
            "rentalid": null,
            "senderid": 42,
            "listingid": 99,
            "messageid": 310,
            "requestid": null,
            "receiverid": 23,
            "listing_name_snapshot": "Cosy Jurong West Flat - 480",
            "listing_address_snapshot": "480 JURONG WEST STREET 41, Singapore 640480"
          },
          "after": {
            "date": "2025-08-04 14:20:00.000",
            "message": "Hello, I'm interested in the flat at block 480. Could we discuss a viewing?",
            "rentalid": null,
            "senderid": 42,
            "listingid": 99,
            "messageid": 310,
            "requestid": null,
            "receiverid": 23,
            "listing_name_snapshot": "Cosy Jurong West Flat - 480",
            "listing_address_snapshot": "480 JURONG WEST STREET 41, Singapore 640480"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T15:44:00",
            "message": "Hi Isabelle, yes. Are you considering a move this year?",
            "rentalid": null,
            "senderid": 23,
            "listingid": null,
            "messageid": 315,
            "requestid": null,
            "receiverid": 42,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-08-04 14:24:00.000",
            "message": "Hi Isabelle, yes. Are you considering a move this year?",
            "rentalid": null,
            "senderid": 23,
            "listingid": null,
            "messageid": 315,
            "requestid": null,
            "receiverid": 42,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T15:51:00",
            "message": "Yes, towards the end of November. I'm checking a few options in Jurong West.",
            "rentalid": null,
            "senderid": 42,
            "listingid": null,
            "messageid": 326,
            "requestid": null,
            "receiverid": 23,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-08-04 14:31:00.000",
            "message": "Yes, I could move in the next few days. I'm checking a few options in Jurong West.",
            "rentalid": null,
            "senderid": 42,
            "listingid": null,
            "messageid": 326,
            "requestid": null,
            "receiverid": 23,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T15:58:00",
            "message": "Understood. The current asking rent is S$3,100 per month.",
            "rentalid": null,
            "senderid": 23,
            "listingid": null,
            "messageid": 336,
            "requestid": null,
            "receiverid": 42,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-08-04 14:38:00.000",
            "message": "Understood. The current asking rent is S$3,100 per month.",
            "rentalid": null,
            "senderid": 23,
            "listingid": null,
            "messageid": 336,
            "requestid": null,
            "receiverid": 42,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T16:06:00",
            "message": "That is within the range I'm looking at. Could I see it on Saturday?",
            "rentalid": null,
            "senderid": 42,
            "listingid": null,
            "messageid": 347,
            "requestid": null,
            "receiverid": 23,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-08-04 14:46:00.000",
            "message": "That is within the range I'm looking at. Could I see it on Tuesday?",
            "rentalid": null,
            "senderid": 42,
            "listingid": null,
            "messageid": 347,
            "requestid": null,
            "receiverid": 23,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T16:15:00",
            "message": "I'll check Saturday availability. We can talk further once you've had a look.",
            "rentalid": null,
            "senderid": 23,
            "listingid": null,
            "messageid": 360,
            "requestid": null,
            "receiverid": 42,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-08-04 14:55:00.000",
            "message": "I'll check Tuesday availability. We can talk further once you've had a look.",
            "rentalid": null,
            "senderid": 23,
            "listingid": null,
            "messageid": 360,
            "requestid": null,
            "receiverid": 42,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 99,
        "tenant_userid": 42,
        "rental_price": 3100,
        "deposit_price": 3100,
        "created_at": "2025-08-06 17:00:00.000",
        "accepted_at": "2025-08-07 18:00:00.000",
        "rental_date": "2025-08-07 18:00:00.000",
        "lease_expiry": "2028-04-07 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 23,
        "receiverid": 42,
        "date": "2025-08-06 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 3100,
          "date": "2025-08-07 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 3100,
          "date": "2025-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3100,
          "date": "2025-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3100,
          "date": "2025-11-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3100,
          "date": "2025-12-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3100,
          "date": "2026-01-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3100,
          "date": "2026-02-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3100,
          "date": "2026-03-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3100,
          "date": "2026-04-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3100,
          "date": "2026-05-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3100,
          "date": "2026-06-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3100,
          "date": "2026-07-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3100,
          "date": "2026-08-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3100,
          "date": "2026-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3100,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 101,
      "ownerid": 24,
      "tenantid": 43,
      "owner_name": "Leila Hamid",
      "tenant_name": "Sean Chew",
      "months": 12,
      "before_listing": {
        "listingid": 101,
        "owneruserid": 24,
        "tenantuserid": null,
        "name": "Welcoming Jurong West Flat - 482",
        "location": "482 JURONG WEST STREET 41, Singapore 640482",
        "price": 2600,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 101,
        "owneruserid": 24,
        "tenantuserid": 43,
        "name": "Welcoming Jurong West Flat - 482",
        "location": "482 JURONG WEST STREET 41, Singapore 640482",
        "price": 2600,
        "flagged": false,
        "created_at": "2026-10-02 18:00:00.000"
      },
      "users": [
        {
          "userid": 24,
          "name": "Leila Hamid",
          "role": "USER",
          "flagged": 0,
          "created_at": "2026-09-09 16:30:00"
        },
        {
          "userid": 43,
          "name": "Sean Chew",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-29 12:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T15:44:00",
            "message": "Hi, may I enquire about the flat at block 482 Jurong West? Is it still available?",
            "rentalid": null,
            "senderid": 43,
            "listingid": 101,
            "messageid": 316,
            "requestid": null,
            "receiverid": 24,
            "listing_name_snapshot": "Welcoming Jurong West Flat - 482",
            "listing_address_snapshot": "482 JURONG WEST STREET 41, Singapore 640482"
          },
          "after": {
            "date": "2026-10-03 14:20:00.000",
            "message": "Hi, may I enquire about the flat at block 482 Jurong West? Is it still available?",
            "rentalid": null,
            "senderid": 43,
            "listingid": 101,
            "messageid": 316,
            "requestid": null,
            "receiverid": 24,
            "listing_name_snapshot": "Welcoming Jurong West Flat - 482",
            "listing_address_snapshot": "482 JURONG WEST STREET 41, Singapore 640482"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T15:48:00",
            "message": "Hi Sean, yes, it is. Do you have any questions before arranging a viewing?",
            "rentalid": null,
            "senderid": 24,
            "listingid": null,
            "messageid": 321,
            "requestid": null,
            "receiverid": 43,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-10-03 14:24:00.000",
            "message": "Hi Sean, yes, it is. Do you have any questions before arranging a viewing?",
            "rentalid": null,
            "senderid": 24,
            "listingid": null,
            "messageid": 321,
            "requestid": null,
            "receiverid": 43,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T15:55:00",
            "message": "I'd like to see the space first. I may need to fit a desk, so the layout matters to me.",
            "rentalid": null,
            "senderid": 43,
            "listingid": null,
            "messageid": 332,
            "requestid": null,
            "receiverid": 24,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-10-03 14:31:00.000",
            "message": "I'd like to see the space first. I may need to fit a desk, so the layout matters to me.",
            "rentalid": null,
            "senderid": 43,
            "listingid": null,
            "messageid": 332,
            "requestid": null,
            "receiverid": 24,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T16:02:00",
            "message": "That is worth checking in person. Are weekday evenings convenient?",
            "rentalid": null,
            "senderid": 24,
            "listingid": null,
            "messageid": 342,
            "requestid": null,
            "receiverid": 43,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-10-03 14:38:00.000",
            "message": "That is worth checking in person. Are evenings convenient?",
            "rentalid": null,
            "senderid": 24,
            "listingid": null,
            "messageid": 342,
            "requestid": null,
            "receiverid": 43,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T16:10:00",
            "message": "Tuesday evening should work. I can bring my measurements to compare.",
            "rentalid": null,
            "senderid": 43,
            "listingid": null,
            "messageid": 353,
            "requestid": null,
            "receiverid": 24,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-10-03 14:46:00.000",
            "message": "Sunday evening should work. I can bring my measurements to compare.",
            "rentalid": null,
            "senderid": 43,
            "listingid": null,
            "messageid": 353,
            "requestid": null,
            "receiverid": 24,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T16:19:00",
            "message": "Sounds useful. I'll check Tuesday and confirm a time with you.",
            "rentalid": null,
            "senderid": 24,
            "listingid": null,
            "messageid": 365,
            "requestid": null,
            "receiverid": 43,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-10-03 14:55:00.000",
            "message": "Sounds useful. I'll check Sunday and confirm a time with you.",
            "rentalid": null,
            "senderid": 24,
            "listingid": null,
            "messageid": 365,
            "requestid": null,
            "receiverid": 43,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 101,
        "tenant_userid": 43,
        "rental_price": 2600,
        "deposit_price": 2600,
        "created_at": "2026-10-05 17:00:00.000",
        "accepted_at": "2026-10-06 18:00:00.000",
        "rental_date": "2026-10-06 18:00:00.000",
        "lease_expiry": "2027-10-06 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 24,
        "receiverid": 43,
        "date": "2026-10-05 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 2600,
          "date": "2026-10-06 17:59:59.000",
          "convention": "initial_simulated_payment"
        }
      ]
    },
    {
      "listingid": 103,
      "ownerid": 25,
      "tenantid": 44,
      "owner_name": "Ethan Koh",
      "tenant_name": "Kavitha Pillai",
      "months": 29,
      "before_listing": {
        "listingid": 103,
        "owneruserid": 25,
        "tenantuserid": null,
        "name": "Bright Jurong West Flat - 484",
        "location": "484 JURONG WEST AVENUE 1, Singapore 640484",
        "price": 5550,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 103,
        "owneruserid": 25,
        "tenantuserid": 44,
        "name": "Bright Jurong West Flat - 484",
        "location": "484 JURONG WEST AVENUE 1, Singapore 640484",
        "price": 5550,
        "flagged": false,
        "created_at": "2025-10-04 18:00:00.000"
      },
      "users": [
        {
          "userid": 25,
          "name": "Ethan Koh",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-09 10:00:00"
        },
        {
          "userid": 44,
          "name": "Kavitha Pillai",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-06-01 13:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T15:48:00",
            "message": "Hi, I'm interested in the block 484 Jurong West flat. Could I arrange a visit?",
            "rentalid": null,
            "senderid": 44,
            "listingid": 103,
            "messageid": 322,
            "requestid": null,
            "receiverid": 25,
            "listing_name_snapshot": "Bright Jurong West Flat - 484",
            "listing_address_snapshot": "484 JURONG WEST AVENUE 1, Singapore 640484"
          },
          "after": {
            "date": "2025-10-05 14:20:00.000",
            "message": "Hi, I'm interested in the block 484 Jurong West flat. Could I arrange a visit?",
            "rentalid": null,
            "senderid": 44,
            "listingid": 103,
            "messageid": 322,
            "requestid": null,
            "receiverid": 25,
            "listing_name_snapshot": "Bright Jurong West Flat - 484",
            "listing_address_snapshot": "484 JURONG WEST AVENUE 1, Singapore 640484"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T15:52:00",
            "message": "Hi Kavitha, yes. What move-in month are you thinking about?",
            "rentalid": null,
            "senderid": 25,
            "listingid": null,
            "messageid": 327,
            "requestid": null,
            "receiverid": 44,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-10-05 14:24:00.000",
            "message": "Hi Kavitha, yes. What move-in month are you thinking about?",
            "rentalid": null,
            "senderid": 25,
            "listingid": null,
            "messageid": 327,
            "requestid": null,
            "receiverid": 44,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T15:59:00",
            "message": "December, though the exact date is still flexible. I'd like to view it with my partner.",
            "rentalid": null,
            "senderid": 44,
            "listingid": null,
            "messageid": 338,
            "requestid": null,
            "receiverid": 25,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-10-05 14:31:00.000",
            "message": "This month, and I can move soon if it suits us. I'd like to view it with my partner.",
            "rentalid": null,
            "senderid": 44,
            "listingid": null,
            "messageid": 338,
            "requestid": null,
            "receiverid": 25,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T16:06:00",
            "message": "No problem. Would you both be available on a weekend?",
            "rentalid": null,
            "senderid": 25,
            "listingid": null,
            "messageid": 348,
            "requestid": null,
            "receiverid": 44,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-10-05 14:38:00.000",
            "message": "No problem. Would you both be available tomorrow?",
            "rentalid": null,
            "senderid": 25,
            "listingid": null,
            "messageid": 348,
            "requestid": null,
            "receiverid": 44,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T16:14:00",
            "message": "Sunday afternoon is usually best. Is S$5,550 the current monthly asking rent?",
            "rentalid": null,
            "senderid": 44,
            "listingid": null,
            "messageid": 358,
            "requestid": null,
            "receiverid": 25,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-10-05 14:46:00.000",
            "message": "Monday afternoon is usually best. Is S$5,550 the current monthly asking rent?",
            "rentalid": null,
            "senderid": 44,
            "listingid": null,
            "messageid": 358,
            "requestid": null,
            "receiverid": 25,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T16:23:00",
            "message": "Yes, it is. I'll check a Sunday slot and get back to you here.",
            "rentalid": null,
            "senderid": 25,
            "listingid": null,
            "messageid": 371,
            "requestid": null,
            "receiverid": 44,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-10-05 14:55:00.000",
            "message": "Yes, it is. I'll check a Monday slot and get back to you here.",
            "rentalid": null,
            "senderid": 25,
            "listingid": null,
            "messageid": 371,
            "requestid": null,
            "receiverid": 44,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 103,
        "tenant_userid": 44,
        "rental_price": 5550,
        "deposit_price": 5550,
        "created_at": "2025-10-07 17:00:00.000",
        "accepted_at": "2025-10-08 18:00:00.000",
        "rental_date": "2025-10-08 18:00:00.000",
        "lease_expiry": "2028-03-08 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 25,
        "receiverid": 44,
        "date": "2025-10-07 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 5550,
          "date": "2025-10-08 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 5550,
          "date": "2025-11-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 5550,
          "date": "2025-12-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 5550,
          "date": "2026-01-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 5550,
          "date": "2026-02-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 5550,
          "date": "2026-03-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 5550,
          "date": "2026-04-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 5550,
          "date": "2026-05-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 5550,
          "date": "2026-06-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 5550,
          "date": "2026-07-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 5550,
          "date": "2026-08-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 5550,
          "date": "2026-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 5550,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 105,
      "ownerid": 26,
      "tenantid": 45,
      "owner_name": "Mei Ling Chan",
      "tenant_name": "Alicia Foo",
      "months": 23,
      "before_listing": {
        "listingid": 105,
        "owneruserid": 26,
        "tenantuserid": null,
        "name": "Spacious Jurong West Flat - 486",
        "location": "486 JURONG WEST AVENUE 1, Singapore 640486",
        "price": 4550,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 105,
        "owneruserid": 26,
        "tenantuserid": 45,
        "name": "Spacious Jurong West Flat - 486",
        "location": "486 JURONG WEST AVENUE 1, Singapore 640486",
        "price": 4550,
        "flagged": false,
        "created_at": "2025-11-02 18:00:00.000"
      },
      "users": [
        {
          "userid": 26,
          "name": "Mei Ling Chan",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-12 11:00:00"
        },
        {
          "userid": 45,
          "name": "Alicia Foo",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-06-04 14:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T15:52:00",
            "message": "Hello, is the flat at block 486 Jurong West still available to view?",
            "rentalid": null,
            "senderid": 45,
            "listingid": 105,
            "messageid": 328,
            "requestid": null,
            "receiverid": 26,
            "listing_name_snapshot": "Spacious Jurong West Flat - 486",
            "listing_address_snapshot": "486 JURONG WEST AVENUE 1, Singapore 640486"
          },
          "after": {
            "date": "2025-11-03 14:20:00.000",
            "message": "Hello, is the flat at block 486 Jurong West still available to view?",
            "rentalid": null,
            "senderid": 45,
            "listingid": 105,
            "messageid": 328,
            "requestid": null,
            "receiverid": 26,
            "listing_name_snapshot": "Spacious Jurong West Flat - 486",
            "listing_address_snapshot": "486 JURONG WEST AVENUE 1, Singapore 640486"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T15:56:00",
            "message": "Hi Alicia, yes. Do you prefer a weekday or weekend visit?",
            "rentalid": null,
            "senderid": 26,
            "listingid": null,
            "messageid": 333,
            "requestid": null,
            "receiverid": 45,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-11-03 14:24:00.000",
            "message": "Hi Alicia, yes. Do you prefer an evening or daytime visit?",
            "rentalid": null,
            "senderid": 26,
            "listingid": null,
            "messageid": 333,
            "requestid": null,
            "receiverid": 45,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T16:03:00",
            "message": "Weekday evening if possible. I'd like to compare the layout with another flat I've seen.",
            "rentalid": null,
            "senderid": 45,
            "listingid": null,
            "messageid": 344,
            "requestid": null,
            "receiverid": 26,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-11-03 14:31:00.000",
            "message": "An evening if possible. I'd like to compare the layout with another flat I've seen.",
            "rentalid": null,
            "senderid": 45,
            "listingid": null,
            "messageid": 344,
            "requestid": null,
            "receiverid": 26,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T16:10:00",
            "message": "That's fine. Which evenings are you free?",
            "rentalid": null,
            "senderid": 26,
            "listingid": null,
            "messageid": 354,
            "requestid": null,
            "receiverid": 45,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-11-03 14:38:00.000",
            "message": "That's fine. Which evenings are you free?",
            "rentalid": null,
            "senderid": 26,
            "listingid": null,
            "messageid": 354,
            "requestid": null,
            "receiverid": 45,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T16:18:00",
            "message": "Wednesday and Friday after 7. I'm only shortlisting at this point.",
            "rentalid": null,
            "senderid": 45,
            "listingid": null,
            "messageid": 363,
            "requestid": null,
            "receiverid": 26,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-11-03 14:46:00.000",
            "message": "Tomorrow after 7. I'm only shortlisting at this point.",
            "rentalid": null,
            "senderid": 45,
            "listingid": null,
            "messageid": 363,
            "requestid": null,
            "receiverid": 26,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T16:27:00",
            "message": "Understood. I'll check those evenings and suggest a time; you can decide after viewing.",
            "rentalid": null,
            "senderid": 26,
            "listingid": null,
            "messageid": 376,
            "requestid": null,
            "receiverid": 45,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-11-03 14:55:00.000",
            "message": "Understood. I'll check tomorrow evening and suggest a time; you can decide after viewing.",
            "rentalid": null,
            "senderid": 26,
            "listingid": null,
            "messageid": 376,
            "requestid": null,
            "receiverid": 45,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 105,
        "tenant_userid": 45,
        "rental_price": 4550,
        "deposit_price": 4550,
        "created_at": "2025-11-05 17:00:00.000",
        "accepted_at": "2025-11-06 18:00:00.000",
        "rental_date": "2025-11-06 18:00:00.000",
        "lease_expiry": "2027-10-06 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 26,
        "receiverid": 45,
        "date": "2025-11-05 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 4550,
          "date": "2025-11-06 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 4550,
          "date": "2025-12-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4550,
          "date": "2026-01-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4550,
          "date": "2026-02-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4550,
          "date": "2026-03-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4550,
          "date": "2026-04-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4550,
          "date": "2026-05-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4550,
          "date": "2026-06-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4550,
          "date": "2026-07-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4550,
          "date": "2026-08-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4550,
          "date": "2026-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4550,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 107,
      "ownerid": 27,
      "tenantid": 46,
      "owner_name": "Farah Abdullah",
      "tenant_name": "Shawn Tan",
      "months": 18,
      "before_listing": {
        "listingid": 107,
        "owneruserid": 27,
        "tenantuserid": null,
        "name": "Quiet Jurong West Flat - 488",
        "location": "488 JURONG WEST AVENUE 1, Singapore 640488",
        "price": 4200,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 107,
        "owneruserid": 27,
        "tenantuserid": 46,
        "name": "Quiet Jurong West Flat - 488",
        "location": "488 JURONG WEST AVENUE 1, Singapore 640488",
        "price": 4200,
        "flagged": false,
        "created_at": "2025-12-05 18:00:00.000"
      },
      "users": [
        {
          "userid": 27,
          "name": "Farah Abdullah",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-15 12:00:00"
        },
        {
          "userid": 46,
          "name": "Shawn Tan",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-06-07 15:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T15:56:00",
            "message": "Hi, I'd like to enquire about the flat at block 488. Is the listing still active?",
            "rentalid": null,
            "senderid": 46,
            "listingid": 107,
            "messageid": 334,
            "requestid": null,
            "receiverid": 27,
            "listing_name_snapshot": "Quiet Jurong West Flat - 488",
            "listing_address_snapshot": "488 JURONG WEST AVENUE 1, Singapore 640488"
          },
          "after": {
            "date": "2025-12-06 14:20:00.000",
            "message": "Hi, I'd like to enquire about the flat at block 488. Is the listing still active?",
            "rentalid": null,
            "senderid": 46,
            "listingid": 107,
            "messageid": 334,
            "requestid": null,
            "receiverid": 27,
            "listing_name_snapshot": "Quiet Jurong West Flat - 488",
            "listing_address_snapshot": "488 JURONG WEST AVENUE 1, Singapore 640488"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T16:00:00",
            "message": "Hi Shawn, yes. What are you hoping to find out?",
            "rentalid": null,
            "senderid": 27,
            "listingid": null,
            "messageid": 339,
            "requestid": null,
            "receiverid": 46,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-12-06 14:24:00.000",
            "message": "Hi Shawn, yes. What are you hoping to find out?",
            "rentalid": null,
            "senderid": 27,
            "listingid": null,
            "messageid": 339,
            "requestid": null,
            "receiverid": 46,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T16:07:00",
            "message": "I'm checking places in Jurong West. Is the advertised S$4,200 rent still current?",
            "rentalid": null,
            "senderid": 46,
            "listingid": null,
            "messageid": 350,
            "requestid": null,
            "receiverid": 27,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-12-06 14:31:00.000",
            "message": "I'm checking places in Jurong West. Is the advertised S$4,200 rent still current?",
            "rentalid": null,
            "senderid": 46,
            "listingid": null,
            "messageid": 350,
            "requestid": null,
            "receiverid": 27,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T16:14:00",
            "message": "Yes, that's the monthly asking rent. Would you like to arrange a viewing?",
            "rentalid": null,
            "senderid": 27,
            "listingid": null,
            "messageid": 359,
            "requestid": null,
            "receiverid": 46,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-12-06 14:38:00.000",
            "message": "Yes, that's the monthly asking rent. Would you like to arrange a viewing?",
            "rentalid": null,
            "senderid": 27,
            "listingid": null,
            "messageid": 359,
            "requestid": null,
            "receiverid": 46,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T16:22:00",
            "message": "Yes, please. I can usually make Saturday mornings.",
            "rentalid": null,
            "senderid": 46,
            "listingid": null,
            "messageid": 369,
            "requestid": null,
            "receiverid": 27,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-12-06 14:46:00.000",
            "message": "Yes, please. I can usually make Sunday mornings.",
            "rentalid": null,
            "senderid": 46,
            "listingid": null,
            "messageid": 369,
            "requestid": null,
            "receiverid": 27,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T16:31:00",
            "message": "I'll check a Saturday slot and message you. We can discuss your timing after the visit.",
            "rentalid": null,
            "senderid": 27,
            "listingid": null,
            "messageid": 381,
            "requestid": null,
            "receiverid": 46,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-12-06 14:55:00.000",
            "message": "I'll check a Sunday slot and message you. We can discuss your timing after the visit.",
            "rentalid": null,
            "senderid": 27,
            "listingid": null,
            "messageid": 381,
            "requestid": null,
            "receiverid": 46,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 107,
        "tenant_userid": 46,
        "rental_price": 4200,
        "deposit_price": 4200,
        "created_at": "2025-12-08 17:00:00.000",
        "accepted_at": "2025-12-09 18:00:00.000",
        "rental_date": "2025-12-09 18:00:00.000",
        "lease_expiry": "2027-06-09 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 27,
        "receiverid": 46,
        "date": "2025-12-08 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 4200,
          "date": "2025-12-09 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 4200,
          "date": "2026-01-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4200,
          "date": "2026-02-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4200,
          "date": "2026-03-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4200,
          "date": "2026-04-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4200,
          "date": "2026-05-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4200,
          "date": "2026-06-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4200,
          "date": "2026-07-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4200,
          "date": "2026-08-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4200,
          "date": "2026-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4200,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 109,
      "ownerid": 28,
      "tenantid": 47,
      "owner_name": "Vikram Rao",
      "tenant_name": "Melissa Seah",
      "months": 35,
      "before_listing": {
        "listingid": 109,
        "owneruserid": 28,
        "tenantuserid": null,
        "name": "Cosy Jurong West Flat - 490",
        "location": "490 JURONG WEST AVENUE 1, Singapore 640490",
        "price": 4600,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 109,
        "owneruserid": 28,
        "tenantuserid": 47,
        "name": "Cosy Jurong West Flat - 490",
        "location": "490 JURONG WEST AVENUE 1, Singapore 640490",
        "price": 4600,
        "flagged": false,
        "created_at": "2026-01-03 18:00:00.000"
      },
      "users": [
        {
          "userid": 28,
          "name": "Vikram Rao",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-18 13:00:00"
        },
        {
          "userid": 47,
          "name": "Melissa Seah",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-06-10 16:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T16:00:00",
            "message": "Hello, I'm interested in the Jurong West flat at block 490. Are you taking viewings?",
            "rentalid": null,
            "senderid": 47,
            "listingid": 109,
            "messageid": 340,
            "requestid": null,
            "receiverid": 28,
            "listing_name_snapshot": "Cosy Jurong West Flat - 490",
            "listing_address_snapshot": "490 JURONG WEST AVENUE 1, Singapore 640490"
          },
          "after": {
            "date": "2026-01-04 14:20:00.000",
            "message": "Hello, I'm interested in the Jurong West flat at block 490. Are you taking viewings?",
            "rentalid": null,
            "senderid": 47,
            "listingid": 109,
            "messageid": 340,
            "requestid": null,
            "receiverid": 28,
            "listing_name_snapshot": "Cosy Jurong West Flat - 490",
            "listing_address_snapshot": "490 JURONG WEST AVENUE 1, Singapore 640490"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T16:04:00",
            "message": "Hi Melissa, yes. Are you looking to move immediately or a little later?",
            "rentalid": null,
            "senderid": 28,
            "listingid": null,
            "messageid": 345,
            "requestid": null,
            "receiverid": 47,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-01-04 14:24:00.000",
            "message": "Hi Melissa, yes. Are you looking to move immediately or a little later?",
            "rentalid": null,
            "senderid": 28,
            "listingid": null,
            "messageid": 345,
            "requestid": null,
            "receiverid": 47,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T16:11:00",
            "message": "A little later, perhaps December. I'd prefer to view before talking about the lease.",
            "rentalid": null,
            "senderid": 47,
            "listingid": null,
            "messageid": 356,
            "requestid": null,
            "receiverid": 28,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-01-04 14:31:00.000",
            "message": "I can move soon if it works out. I'd prefer to view before talking about the lease.",
            "rentalid": null,
            "senderid": 47,
            "listingid": null,
            "messageid": 356,
            "requestid": null,
            "receiverid": 28,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T16:18:00",
            "message": "Of course. Is an evening viewing suitable for you?",
            "rentalid": null,
            "senderid": 28,
            "listingid": null,
            "messageid": 364,
            "requestid": null,
            "receiverid": 47,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-01-04 14:38:00.000",
            "message": "Of course. Is an evening viewing suitable for you?",
            "rentalid": null,
            "senderid": 28,
            "listingid": null,
            "messageid": 364,
            "requestid": null,
            "receiverid": 47,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T16:26:00",
            "message": "Thursday evening would be good. I need to check whether my partner can join.",
            "rentalid": null,
            "senderid": 47,
            "listingid": null,
            "messageid": 374,
            "requestid": null,
            "receiverid": 28,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-01-04 14:46:00.000",
            "message": "Monday evening would be good. I need to check whether my partner can join.",
            "rentalid": null,
            "senderid": 47,
            "listingid": null,
            "messageid": 374,
            "requestid": null,
            "receiverid": 28,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T16:35:00",
            "message": "Sure, confirm with your partner first and send me a time range that works.",
            "rentalid": null,
            "senderid": 28,
            "listingid": null,
            "messageid": 387,
            "requestid": null,
            "receiverid": 47,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-01-04 14:55:00.000",
            "message": "Sure, confirm with your partner first and send me a time range that works.",
            "rentalid": null,
            "senderid": 28,
            "listingid": null,
            "messageid": 387,
            "requestid": null,
            "receiverid": 47,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 109,
        "tenant_userid": 47,
        "rental_price": 4600,
        "deposit_price": 4600,
        "created_at": "2026-01-06 17:00:00.000",
        "accepted_at": "2026-01-07 18:00:00.000",
        "rental_date": "2026-01-07 18:00:00.000",
        "lease_expiry": "2028-12-07 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 28,
        "receiverid": 47,
        "date": "2026-01-06 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 4600,
          "date": "2026-01-07 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 4600,
          "date": "2026-02-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4600,
          "date": "2026-03-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4600,
          "date": "2026-04-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4600,
          "date": "2026-05-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4600,
          "date": "2026-06-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4600,
          "date": "2026-07-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4600,
          "date": "2026-08-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4600,
          "date": "2026-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4600,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 111,
      "ownerid": 29,
      "tenantid": 48,
      "owner_name": "Nadia Hassan",
      "tenant_name": "Imran Ismail",
      "months": 24,
      "before_listing": {
        "listingid": 111,
        "owneruserid": 29,
        "tenantuserid": null,
        "name": "Welcoming Jurong East Flat - 101",
        "location": "101 JURONG EAST STREET 13, Singapore 600101",
        "price": 3400,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 111,
        "owneruserid": 29,
        "tenantuserid": 48,
        "name": "Welcoming Jurong East Flat - 101",
        "location": "101 JURONG EAST STREET 13, Singapore 600101",
        "price": 3400,
        "flagged": false,
        "created_at": "2025-07-18 18:00:00.000"
      },
      "users": [
        {
          "userid": 29,
          "name": "Nadia Hassan",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-21 14:00:00"
        },
        {
          "userid": 48,
          "name": "Imran Ismail",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-10 17:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T16:04:00",
            "message": "Hi, is the block 101 Jurong East flat available? I'm interested in the area.",
            "rentalid": null,
            "senderid": 48,
            "listingid": 111,
            "messageid": 346,
            "requestid": null,
            "receiverid": 29,
            "listing_name_snapshot": "Welcoming Jurong East Flat - 101",
            "listing_address_snapshot": "101 JURONG EAST STREET 13, Singapore 600101"
          },
          "after": {
            "date": "2025-07-19 14:20:00.000",
            "message": "Hi, is the block 101 Jurong East flat available? I'm interested in the area.",
            "rentalid": null,
            "senderid": 48,
            "listingid": 111,
            "messageid": 346,
            "requestid": null,
            "receiverid": 29,
            "listing_name_snapshot": "Welcoming Jurong East Flat - 101",
            "listing_address_snapshot": "101 JURONG EAST STREET 13, Singapore 600101"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T16:08:00",
            "message": "Hi Imran, yes. Would you like to arrange a viewing?",
            "rentalid": null,
            "senderid": 29,
            "listingid": null,
            "messageid": 351,
            "requestid": null,
            "receiverid": 48,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-07-19 14:24:00.000",
            "message": "Hi Imran, yes. Would you like to arrange a viewing?",
            "rentalid": null,
            "senderid": 29,
            "listingid": null,
            "messageid": 351,
            "requestid": null,
            "receiverid": 48,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T16:15:00",
            "message": "Yes, ideally this weekend. I'm comparing a few flats before deciding.",
            "rentalid": null,
            "senderid": 48,
            "listingid": null,
            "messageid": 361,
            "requestid": null,
            "receiverid": 29,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-07-19 14:31:00.000",
            "message": "Yes, ideally tomorrow. I'm comparing a few flats before deciding.",
            "rentalid": null,
            "senderid": 48,
            "listingid": null,
            "messageid": 361,
            "requestid": null,
            "receiverid": 29,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T16:22:00",
            "message": "That is fine. Do you have a preferred day?",
            "rentalid": null,
            "senderid": 29,
            "listingid": null,
            "messageid": 370,
            "requestid": null,
            "receiverid": 48,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-07-19 14:38:00.000",
            "message": "That is fine. Do you have a preferred day?",
            "rentalid": null,
            "senderid": 29,
            "listingid": null,
            "messageid": 370,
            "requestid": null,
            "receiverid": 48,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T16:30:00",
            "message": "Saturday afternoon, and I'd like to check the room layout while I'm there.",
            "rentalid": null,
            "senderid": 48,
            "listingid": null,
            "messageid": 380,
            "requestid": null,
            "receiverid": 29,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-07-19 14:46:00.000",
            "message": "Sunday afternoon, and I'd like to check the room layout while I'm there.",
            "rentalid": null,
            "senderid": 48,
            "listingid": null,
            "messageid": 380,
            "requestid": null,
            "receiverid": 29,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T16:39:00",
            "message": "Noted. I'll check Saturday afternoon and confirm a slot before you make the trip.",
            "rentalid": null,
            "senderid": 29,
            "listingid": null,
            "messageid": 392,
            "requestid": null,
            "receiverid": 48,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-07-19 14:55:00.000",
            "message": "Noted. I'll check Sunday afternoon and confirm a slot before you make the trip.",
            "rentalid": null,
            "senderid": 29,
            "listingid": null,
            "messageid": 392,
            "requestid": null,
            "receiverid": 48,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 111,
        "tenant_userid": 48,
        "rental_price": 3400,
        "deposit_price": 3400,
        "created_at": "2025-07-21 17:00:00.000",
        "accepted_at": "2025-07-22 18:00:00.000",
        "rental_date": "2025-07-22 18:00:00.000",
        "lease_expiry": "2027-07-22 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 29,
        "receiverid": 48,
        "date": "2025-07-21 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 3400,
          "date": "2025-07-22 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 3400,
          "date": "2025-08-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3400,
          "date": "2025-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3400,
          "date": "2025-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3400,
          "date": "2025-11-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3400,
          "date": "2025-12-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3400,
          "date": "2026-01-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3400,
          "date": "2026-02-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3400,
          "date": "2026-03-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3400,
          "date": "2026-04-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3400,
          "date": "2026-05-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3400,
          "date": "2026-06-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3400,
          "date": "2026-07-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3400,
          "date": "2026-08-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3400,
          "date": "2026-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 3400,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 113,
      "ownerid": 30,
      "tenantid": 49,
      "owner_name": "Wei Jie Ng",
      "tenant_name": "Leonard Sim",
      "months": 16,
      "before_listing": {
        "listingid": 113,
        "owneruserid": 30,
        "tenantuserid": null,
        "name": "Bright Jurong East Flat - 103",
        "location": "103 JURONG EAST STREET 13, Singapore 600103",
        "price": 2350,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 113,
        "owneruserid": 30,
        "tenantuserid": 49,
        "name": "Bright Jurong East Flat - 103",
        "location": "103 JURONG EAST STREET 13, Singapore 600103",
        "price": 2350,
        "flagged": false,
        "created_at": "2026-02-01 18:00:00.000"
      },
      "users": [
        {
          "userid": 30,
          "name": "Wei Jie Ng",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-24 15:00:00"
        },
        {
          "userid": 49,
          "name": "Leonard Sim",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-13 10:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T16:08:00",
            "message": "Hi, may I enquire about the flat at block 103 Jurong East?",
            "rentalid": null,
            "senderid": 49,
            "listingid": 113,
            "messageid": 352,
            "requestid": null,
            "receiverid": 30,
            "listing_name_snapshot": "Bright Jurong East Flat - 103",
            "listing_address_snapshot": "103 JURONG EAST STREET 13, Singapore 600103"
          },
          "after": {
            "date": "2026-02-02 14:20:00.000",
            "message": "Hi, may I enquire about the flat at block 103 Jurong East?",
            "rentalid": null,
            "senderid": 49,
            "listingid": 113,
            "messageid": 352,
            "requestid": null,
            "receiverid": 30,
            "listing_name_snapshot": "Bright Jurong East Flat - 103",
            "listing_address_snapshot": "103 JURONG EAST STREET 13, Singapore 600103"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T16:12:00",
            "message": "Hi Leonard, certainly. The asking rent is S$2,350 per month.",
            "rentalid": null,
            "senderid": 30,
            "listingid": null,
            "messageid": 357,
            "requestid": null,
            "receiverid": 49,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-02-02 14:24:00.000",
            "message": "Hi Leonard, certainly. The asking rent is S$2,350 per month.",
            "rentalid": null,
            "senderid": 30,
            "listingid": null,
            "messageid": 357,
            "requestid": null,
            "receiverid": 49,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T16:19:00",
            "message": "Thanks. I'm hoping to move around November, but I still need to finalise my dates.",
            "rentalid": null,
            "senderid": 49,
            "listingid": null,
            "messageid": 366,
            "requestid": null,
            "receiverid": 30,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-02-02 14:31:00.000",
            "message": "Thanks. I'm hoping to move soon, but I still need to finalise my dates.",
            "rentalid": null,
            "senderid": 49,
            "listingid": null,
            "messageid": 366,
            "requestid": null,
            "receiverid": 30,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T16:26:00",
            "message": "Understood. We can start with a viewing while you work out the timing.",
            "rentalid": null,
            "senderid": 30,
            "listingid": null,
            "messageid": 375,
            "requestid": null,
            "receiverid": 49,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-02-02 14:38:00.000",
            "message": "Understood. We can start with a viewing while you work out the timing.",
            "rentalid": null,
            "senderid": 30,
            "listingid": null,
            "messageid": 375,
            "requestid": null,
            "receiverid": 49,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T16:34:00",
            "message": "That would help. Are weekday evenings an option?",
            "rentalid": null,
            "senderid": 49,
            "listingid": null,
            "messageid": 385,
            "requestid": null,
            "receiverid": 30,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-02-02 14:46:00.000",
            "message": "That would help. Are evenings an option?",
            "rentalid": null,
            "senderid": 49,
            "listingid": null,
            "messageid": 385,
            "requestid": null,
            "receiverid": 30,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T16:43:00",
            "message": "Yes, send me two evenings that suit you and I'll check which one is possible.",
            "rentalid": null,
            "senderid": 30,
            "listingid": null,
            "messageid": 397,
            "requestid": null,
            "receiverid": 49,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-02-02 14:55:00.000",
            "message": "Yes, send me two evenings that suit you and I'll check which one is possible.",
            "rentalid": null,
            "senderid": 30,
            "listingid": null,
            "messageid": 397,
            "requestid": null,
            "receiverid": 49,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 113,
        "tenant_userid": 49,
        "rental_price": 2350,
        "deposit_price": 2350,
        "created_at": "2026-02-04 17:00:00.000",
        "accepted_at": "2026-02-05 18:00:00.000",
        "rental_date": "2026-02-05 18:00:00.000",
        "lease_expiry": "2027-06-05 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 30,
        "receiverid": 49,
        "date": "2026-02-04 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 2350,
          "date": "2026-02-05 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 2350,
          "date": "2026-03-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2350,
          "date": "2026-04-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2350,
          "date": "2026-05-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2350,
          "date": "2026-06-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2350,
          "date": "2026-07-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2350,
          "date": "2026-08-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2350,
          "date": "2026-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2350,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 115,
      "ownerid": 31,
      "tenantid": 2,
      "owner_name": "Olivia Tan",
      "tenant_name": "Batman",
      "months": 24,
      "before_listing": {
        "listingid": 115,
        "owneruserid": 31,
        "tenantuserid": null,
        "name": "Spacious Jurong East Flat - 105",
        "location": "105 JURONG EAST STREET 13, Singapore 600105",
        "price": 5850,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 115,
        "owneruserid": 31,
        "tenantuserid": 2,
        "name": "Spacious Jurong East Flat - 105",
        "location": "105 JURONG EAST STREET 13, Singapore 600105",
        "price": 5850,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "users": [
        {
          "userid": 31,
          "name": "Olivia Tan",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-27 16:00:00"
        },
        {
          "userid": 2,
          "name": "Batman",
          "role": "USER",
          "flagged": 0,
          "created_at": "2026-02-21 18:15:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T17:01:58.855",
            "message": "Hi is this available?",
            "rentalid": null,
            "senderid": 2,
            "listingid": 115,
            "messageid": 209,
            "requestid": null,
            "receiverid": 31,
            "listing_name_snapshot": "Spacious Jurong East Flat - 105",
            "listing_address_snapshot": "105 JURONG EAST STREET 13, Singapore 600105"
          },
          "after": {
            "date": "2026-10-12T17:01:58.855",
            "message": "Hi is this available?",
            "rentalid": null,
            "senderid": 2,
            "listingid": 115,
            "messageid": 209,
            "requestid": null,
            "receiverid": 31,
            "listing_name_snapshot": "Spacious Jurong East Flat - 105",
            "listing_address_snapshot": "105 JURONG EAST STREET 13, Singapore 600105"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T17:05:58.855",
            "message": "Hi, yes, it is still available. When are you hoping to move?",
            "rentalid": null,
            "senderid": 31,
            "listingid": null,
            "messageid": 412,
            "requestid": null,
            "receiverid": 2,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-10-12T17:05:58.855",
            "message": "Hi, yes, it is still available. When are you hoping to move?",
            "rentalid": null,
            "senderid": 31,
            "listingid": null,
            "messageid": 412,
            "requestid": null,
            "receiverid": 2,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T17:12:58.855",
            "message": "I'm looking at next month. Could I view the flat before discussing anything further?",
            "rentalid": null,
            "senderid": 2,
            "listingid": null,
            "messageid": 415,
            "requestid": null,
            "receiverid": 31,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-10-12T17:12:58.855",
            "message": "I'm looking at next month. Could I view the flat before discussing anything further?",
            "rentalid": null,
            "senderid": 2,
            "listingid": null,
            "messageid": 415,
            "requestid": null,
            "receiverid": 31,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T17:19:58.855",
            "message": "Certainly. Would you prefer a weekday evening or a weekend?",
            "rentalid": null,
            "senderid": 31,
            "listingid": null,
            "messageid": 416,
            "requestid": null,
            "receiverid": 2,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-10-12T17:19:58.855",
            "message": "Certainly. Would you prefer a weekday evening or a weekend?",
            "rentalid": null,
            "senderid": 31,
            "listingid": null,
            "messageid": 416,
            "requestid": null,
            "receiverid": 2,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T17:27:58.855",
            "message": "Saturday afternoon would be better. Is the asking rent still S$5,850 a month?",
            "rentalid": null,
            "senderid": 2,
            "listingid": null,
            "messageid": 417,
            "requestid": null,
            "receiverid": 31,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-10-12T17:27:58.855",
            "message": "Saturday afternoon would be better. Is the asking rent still S$5,850 a month?",
            "rentalid": null,
            "senderid": 2,
            "listingid": null,
            "messageid": 417,
            "requestid": null,
            "receiverid": 31,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T17:36:58.855",
            "message": "Yes, that's the current asking rent. I'll check my Saturday slots and get back to you.",
            "rentalid": null,
            "senderid": 31,
            "listingid": null,
            "messageid": 418,
            "requestid": null,
            "receiverid": 2,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-10-12T17:36:58.855",
            "message": "Yes, that's the current asking rent. I'll check my Saturday slots and get back to you.",
            "rentalid": null,
            "senderid": 31,
            "listingid": null,
            "messageid": 418,
            "requestid": null,
            "receiverid": 2,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 115,
        "tenant_userid": 2,
        "rental_price": 5850,
        "deposit_price": 5850,
        "created_at": "2026-10-12 17:45:00.000",
        "accepted_at": "2026-10-12 18:00:00.000",
        "rental_date": "2026-11-01 12:00:00.000",
        "lease_expiry": "2028-11-01 12:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 31,
        "receiverid": 2,
        "date": "2026-10-12 17:45:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 5850,
          "date": "2026-10-12 17:59:59.000",
          "convention": "initial_simulated_payment"
        }
      ]
    },
    {
      "listingid": 117,
      "ownerid": 32,
      "tenantid": 51,
      "owner_name": "Ravi Kumar",
      "tenant_name": "Aaron Wong",
      "months": 30,
      "before_listing": {
        "listingid": 117,
        "owneruserid": 32,
        "tenantuserid": null,
        "name": "Quiet Jurong East Flat - 107",
        "location": "107 JURONG EAST STREET 13, Singapore 600107",
        "price": 4000,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 117,
        "owneruserid": 32,
        "tenantuserid": 51,
        "name": "Quiet Jurong East Flat - 107",
        "location": "107 JURONG EAST STREET 13, Singapore 600107",
        "price": 4000,
        "flagged": false,
        "created_at": "2025-08-17 18:00:00.000"
      },
      "users": [
        {
          "userid": 32,
          "name": "Ravi Kumar",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-30 17:00:00"
        },
        {
          "userid": 51,
          "name": "Aaron Wong",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-19 12:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T16:16:00",
            "message": "Hello, I'm interested in the flat at block 107 Jurong East. Can it be viewed?",
            "rentalid": null,
            "senderid": 51,
            "listingid": 117,
            "messageid": 362,
            "requestid": null,
            "receiverid": 32,
            "listing_name_snapshot": "Quiet Jurong East Flat - 107",
            "listing_address_snapshot": "107 JURONG EAST STREET 13, Singapore 600107"
          },
          "after": {
            "date": "2025-08-18 14:20:00.000",
            "message": "Hello, I'm interested in the flat at block 107 Jurong East. Can it be viewed?",
            "rentalid": null,
            "senderid": 51,
            "listingid": 117,
            "messageid": 362,
            "requestid": null,
            "receiverid": 32,
            "listing_name_snapshot": "Quiet Jurong East Flat - 107",
            "listing_address_snapshot": "107 JURONG EAST STREET 13, Singapore 600107"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T16:20:00",
            "message": "Hi Aaron, yes. What days are convenient for you?",
            "rentalid": null,
            "senderid": 32,
            "listingid": null,
            "messageid": 367,
            "requestid": null,
            "receiverid": 51,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-08-18 14:24:00.000",
            "message": "Hi Aaron, yes. What days are convenient for you?",
            "rentalid": null,
            "senderid": 32,
            "listingid": null,
            "messageid": 367,
            "requestid": null,
            "receiverid": 51,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T16:27:00",
            "message": "Sunday is easiest. I'd like to bring someone along to help me look at the space.",
            "rentalid": null,
            "senderid": 51,
            "listingid": null,
            "messageid": 377,
            "requestid": null,
            "receiverid": 32,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-08-18 14:31:00.000",
            "message": "Tuesday is easiest. I'd like to bring someone along to help me look at the space.",
            "rentalid": null,
            "senderid": 51,
            "listingid": null,
            "messageid": 377,
            "requestid": null,
            "receiverid": 32,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T16:34:00",
            "message": "That is fine. Are you aiming for a particular move-in month?",
            "rentalid": null,
            "senderid": 32,
            "listingid": null,
            "messageid": 386,
            "requestid": null,
            "receiverid": 51,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-08-18 14:38:00.000",
            "message": "That is fine. Are you aiming for a particular move-in month?",
            "rentalid": null,
            "senderid": 32,
            "listingid": null,
            "messageid": 386,
            "requestid": null,
            "receiverid": 51,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T16:42:00",
            "message": "Probably December. I'm still shortlisting and don't want to rush the decision.",
            "rentalid": null,
            "senderid": 51,
            "listingid": null,
            "messageid": 395,
            "requestid": null,
            "receiverid": 32,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-08-18 14:46:00.000",
            "message": "I could move soon if it suits me. I'm still shortlisting and would like to view first.",
            "rentalid": null,
            "senderid": 51,
            "listingid": null,
            "messageid": 395,
            "requestid": null,
            "receiverid": 32,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T16:51:00",
            "message": "Understood. Let's arrange the viewing first; I'll check which Sunday times are free.",
            "rentalid": null,
            "senderid": 32,
            "listingid": null,
            "messageid": 404,
            "requestid": null,
            "receiverid": 51,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2025-08-18 14:55:00.000",
            "message": "Understood. Let's arrange the viewing first; I'll check which Tuesday times are free.",
            "rentalid": null,
            "senderid": 32,
            "listingid": null,
            "messageid": 404,
            "requestid": null,
            "receiverid": 51,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 117,
        "tenant_userid": 51,
        "rental_price": 4000,
        "deposit_price": 4000,
        "created_at": "2025-08-20 17:00:00.000",
        "accepted_at": "2025-08-21 18:00:00.000",
        "rental_date": "2025-08-21 18:00:00.000",
        "lease_expiry": "2028-02-21 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 32,
        "receiverid": 51,
        "date": "2025-08-20 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 4000,
          "date": "2025-08-21 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 4000,
          "date": "2025-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4000,
          "date": "2025-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4000,
          "date": "2025-11-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4000,
          "date": "2025-12-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4000,
          "date": "2026-01-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4000,
          "date": "2026-02-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4000,
          "date": "2026-03-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4000,
          "date": "2026-04-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4000,
          "date": "2026-05-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4000,
          "date": "2026-06-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4000,
          "date": "2026-07-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4000,
          "date": "2026-08-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4000,
          "date": "2026-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4000,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 119,
      "ownerid": 33,
      "tenantid": 52,
      "owner_name": "Grace Chua",
      "tenant_name": "Kenneth Goh",
      "months": 15,
      "before_listing": {
        "listingid": 119,
        "owneruserid": 33,
        "tenantuserid": null,
        "name": "Cosy Jurong East Flat - 109",
        "location": "109 JURONG EAST STREET 13, Singapore 600109",
        "price": 4400,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 119,
        "owneruserid": 33,
        "tenantuserid": 52,
        "name": "Cosy Jurong East Flat - 109",
        "location": "109 JURONG EAST STREET 13, Singapore 600109",
        "price": 4400,
        "flagged": false,
        "created_at": "2026-03-01 18:00:00.000"
      },
      "users": [
        {
          "userid": 33,
          "name": "Grace Chua",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-06-02 10:00:00"
        },
        {
          "userid": 52,
          "name": "Kenneth Goh",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-22 13:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T16:20:00",
            "message": "Hi, is the flat at block 109 Jurong East still available for enquiries?",
            "rentalid": null,
            "senderid": 52,
            "listingid": 119,
            "messageid": 368,
            "requestid": null,
            "receiverid": 33,
            "listing_name_snapshot": "Cosy Jurong East Flat - 109",
            "listing_address_snapshot": "109 JURONG EAST STREET 13, Singapore 600109"
          },
          "after": {
            "date": "2026-03-02 14:20:00.000",
            "message": "Hi, is the flat at block 109 Jurong East still available for enquiries?",
            "rentalid": null,
            "senderid": 52,
            "listingid": 119,
            "messageid": 368,
            "requestid": null,
            "receiverid": 33,
            "listing_name_snapshot": "Cosy Jurong East Flat - 109",
            "listing_address_snapshot": "109 JURONG EAST STREET 13, Singapore 600109"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T16:24:00",
            "message": "Hi Kenneth, yes. Would you like to ask anything about the listing?",
            "rentalid": null,
            "senderid": 33,
            "listingid": null,
            "messageid": 372,
            "requestid": null,
            "receiverid": 52,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-03-02 14:24:00.000",
            "message": "Hi Kenneth, yes. Would you like to ask anything about the listing?",
            "rentalid": null,
            "senderid": 33,
            "listingid": null,
            "messageid": 372,
            "requestid": null,
            "receiverid": 52,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T16:31:00",
            "message": "I'd like to confirm the asking rent and arrange a viewing after work.",
            "rentalid": null,
            "senderid": 52,
            "listingid": null,
            "messageid": 382,
            "requestid": null,
            "receiverid": 33,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-03-02 14:31:00.000",
            "message": "I'd like to confirm the asking rent and arrange a viewing after work.",
            "rentalid": null,
            "senderid": 52,
            "listingid": null,
            "messageid": 382,
            "requestid": null,
            "receiverid": 33,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T16:38:00",
            "message": "The current asking rent is S$4,400 per month. Which evening works for you?",
            "rentalid": null,
            "senderid": 33,
            "listingid": null,
            "messageid": 391,
            "requestid": null,
            "receiverid": 52,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-03-02 14:38:00.000",
            "message": "The current asking rent is S$4,400 per month. Which evening works for you?",
            "rentalid": null,
            "senderid": 33,
            "listingid": null,
            "messageid": 391,
            "requestid": null,
            "receiverid": 52,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T16:46:00",
            "message": "Friday after 6.30 would be ideal. I can be flexible if that doesn't suit.",
            "rentalid": null,
            "senderid": 52,
            "listingid": null,
            "messageid": 399,
            "requestid": null,
            "receiverid": 33,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-03-02 14:46:00.000",
            "message": "Tuesday after 6.30 would be ideal. I can be flexible if that doesn't suit.",
            "rentalid": null,
            "senderid": 52,
            "listingid": null,
            "messageid": 399,
            "requestid": null,
            "receiverid": 33,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T16:55:00",
            "message": "I'll check Friday and let you know. Please wait for confirmation before heading over.",
            "rentalid": null,
            "senderid": 33,
            "listingid": null,
            "messageid": 407,
            "requestid": null,
            "receiverid": 52,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-03-02 14:55:00.000",
            "message": "I'll check Tuesday and let you know. Please wait for confirmation before heading over.",
            "rentalid": null,
            "senderid": 33,
            "listingid": null,
            "messageid": 407,
            "requestid": null,
            "receiverid": 52,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 119,
        "tenant_userid": 52,
        "rental_price": 4400,
        "deposit_price": 4400,
        "created_at": "2026-03-04 17:00:00.000",
        "accepted_at": "2026-03-05 18:00:00.000",
        "rental_date": "2026-03-05 18:00:00.000",
        "lease_expiry": "2027-06-05 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 33,
        "receiverid": 52,
        "date": "2026-03-04 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 4400,
          "date": "2026-03-05 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 4400,
          "date": "2026-04-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4400,
          "date": "2026-05-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4400,
          "date": "2026-06-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4400,
          "date": "2026-07-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4400,
          "date": "2026-08-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4400,
          "date": "2026-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4400,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 121,
      "ownerid": 34,
      "tenantid": 53,
      "owner_name": "Amir Hakim",
      "tenant_name": "Sarah Quek",
      "months": 34,
      "before_listing": {
        "listingid": 121,
        "owneruserid": 34,
        "tenantuserid": null,
        "name": "Welcoming Jurong East Flat - 111",
        "location": "111 JURONG EAST STREET 13, Singapore 600111",
        "price": 4800,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 121,
        "owneruserid": 34,
        "tenantuserid": 53,
        "name": "Welcoming Jurong East Flat - 111",
        "location": "111 JURONG EAST STREET 13, Singapore 600111",
        "price": 4800,
        "flagged": false,
        "created_at": "2026-04-05 18:00:00.000"
      },
      "users": [
        {
          "userid": 34,
          "name": "Amir Hakim",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-06-05 11:00:00"
        },
        {
          "userid": 53,
          "name": "Sarah Quek",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-25 14:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T16:24:00",
            "message": "Hi, I'm looking at the block 111 Jurong East flat. Could we arrange a viewing?",
            "rentalid": null,
            "senderid": 53,
            "listingid": 121,
            "messageid": 373,
            "requestid": null,
            "receiverid": 34,
            "listing_name_snapshot": "Welcoming Jurong East Flat - 111",
            "listing_address_snapshot": "111 JURONG EAST STREET 13, Singapore 600111"
          },
          "after": {
            "date": "2026-04-06 14:20:00.000",
            "message": "Hi, I'm looking at the block 111 Jurong East flat. Could we arrange a viewing?",
            "rentalid": null,
            "senderid": 53,
            "listingid": 121,
            "messageid": 373,
            "requestid": null,
            "receiverid": 34,
            "listing_name_snapshot": "Welcoming Jurong East Flat - 111",
            "listing_address_snapshot": "111 JURONG EAST STREET 13, Singapore 600111"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T16:28:00",
            "message": "Hi Sarah, yes. Are you looking to move soon?",
            "rentalid": null,
            "senderid": 34,
            "listingid": null,
            "messageid": 378,
            "requestid": null,
            "receiverid": 53,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-04-06 14:24:00.000",
            "message": "Hi Sarah, yes. Are you looking to move soon?",
            "rentalid": null,
            "senderid": 34,
            "listingid": null,
            "messageid": 378,
            "requestid": null,
            "receiverid": 53,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T16:35:00",
            "message": "Around the end of November. I'd like to see it first and then think about the lease length.",
            "rentalid": null,
            "senderid": 53,
            "listingid": null,
            "messageid": 388,
            "requestid": null,
            "receiverid": 34,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-04-06 14:31:00.000",
            "message": "In the next few days if it suits me. I'd like to see it first and then think about the lease length.",
            "rentalid": null,
            "senderid": 53,
            "listingid": null,
            "messageid": 388,
            "requestid": null,
            "receiverid": 34,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T16:42:00",
            "message": "Of course. Would a weekend visit suit you?",
            "rentalid": null,
            "senderid": 34,
            "listingid": null,
            "messageid": 396,
            "requestid": null,
            "receiverid": 53,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-04-06 14:38:00.000",
            "message": "Of course. Would a visit tomorrow suit you?",
            "rentalid": null,
            "senderid": 34,
            "listingid": null,
            "messageid": 396,
            "requestid": null,
            "receiverid": 53,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T16:50:00",
            "message": "Saturday morning would be best. Is it okay if I take some measurements during the visit?",
            "rentalid": null,
            "senderid": 53,
            "listingid": null,
            "messageid": 402,
            "requestid": null,
            "receiverid": 34,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-04-06 14:46:00.000",
            "message": "Tuesday morning would be best. Is it okay if I take some measurements during the visit?",
            "rentalid": null,
            "senderid": 53,
            "listingid": null,
            "messageid": 402,
            "requestid": null,
            "receiverid": 34,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T16:59:00",
            "message": "Yes, you can check measurements while viewing. I'll confirm whether Saturday morning works.",
            "rentalid": null,
            "senderid": 34,
            "listingid": null,
            "messageid": 409,
            "requestid": null,
            "receiverid": 53,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-04-06 14:55:00.000",
            "message": "Yes, you can check measurements while viewing. I'll confirm whether Tuesday morning works.",
            "rentalid": null,
            "senderid": 34,
            "listingid": null,
            "messageid": 409,
            "requestid": null,
            "receiverid": 53,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 121,
        "tenant_userid": 53,
        "rental_price": 4800,
        "deposit_price": 4800,
        "created_at": "2026-04-08 17:00:00.000",
        "accepted_at": "2026-04-09 18:00:00.000",
        "rental_date": "2026-04-09 18:00:00.000",
        "lease_expiry": "2029-02-09 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 34,
        "receiverid": 53,
        "date": "2026-04-08 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 4800,
          "date": "2026-04-09 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 4800,
          "date": "2026-05-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4800,
          "date": "2026-06-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4800,
          "date": "2026-07-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4800,
          "date": "2026-08-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4800,
          "date": "2026-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 4800,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 123,
      "ownerid": 35,
      "tenantid": 54,
      "owner_name": "Natalie Wong",
      "tenant_name": "Rohan Mehta",
      "months": 21,
      "before_listing": {
        "listingid": 123,
        "owneruserid": 35,
        "tenantuserid": null,
        "name": "Bright Jurong East Flat - 113",
        "location": "113 JURONG EAST STREET 13, Singapore 600113",
        "price": 2950,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 123,
        "owneruserid": 35,
        "tenantuserid": 54,
        "name": "Bright Jurong East Flat - 113",
        "location": "113 JURONG EAST STREET 13, Singapore 600113",
        "price": 2950,
        "flagged": false,
        "created_at": "2026-06-04 18:00:00.000"
      },
      "users": [
        {
          "userid": 35,
          "name": "Natalie Wong",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-06-08 12:00:00"
        },
        {
          "userid": 54,
          "name": "Rohan Mehta",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-28 15:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T16:28:00",
            "message": "Hello, is the flat at block 113 Jurong East still available? I'm comparing places nearby.",
            "rentalid": null,
            "senderid": 54,
            "listingid": 123,
            "messageid": 379,
            "requestid": null,
            "receiverid": 35,
            "listing_name_snapshot": "Bright Jurong East Flat - 113",
            "listing_address_snapshot": "113 JURONG EAST STREET 13, Singapore 600113"
          },
          "after": {
            "date": "2026-06-05 14:20:00.000",
            "message": "Hello, is the flat at block 113 Jurong East still available? I'm comparing places nearby.",
            "rentalid": null,
            "senderid": 54,
            "listingid": 123,
            "messageid": 379,
            "requestid": null,
            "receiverid": 35,
            "listing_name_snapshot": "Bright Jurong East Flat - 113",
            "listing_address_snapshot": "113 JURONG EAST STREET 13, Singapore 600113"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T16:32:00",
            "message": "Hi Rohan, yes. What would you like to know?",
            "rentalid": null,
            "senderid": 35,
            "listingid": null,
            "messageid": 383,
            "requestid": null,
            "receiverid": 54,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-06-05 14:24:00.000",
            "message": "Hi Rohan, yes. What would you like to know?",
            "rentalid": null,
            "senderid": 35,
            "listingid": null,
            "messageid": 383,
            "requestid": null,
            "receiverid": 54,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T16:39:00",
            "message": "Is S$2,950 still the monthly asking rent? I'd also like to arrange a visit.",
            "rentalid": null,
            "senderid": 54,
            "listingid": null,
            "messageid": 393,
            "requestid": null,
            "receiverid": 35,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-06-05 14:31:00.000",
            "message": "Is S$2,950 still the monthly asking rent? I'd also like to arrange a visit.",
            "rentalid": null,
            "senderid": 54,
            "listingid": null,
            "messageid": 393,
            "requestid": null,
            "receiverid": 35,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T16:46:00",
            "message": "Yes, that is the asking rent. When are you normally free?",
            "rentalid": null,
            "senderid": 35,
            "listingid": null,
            "messageid": 400,
            "requestid": null,
            "receiverid": 54,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-06-05 14:38:00.000",
            "message": "Yes, that is the asking rent. When are you normally free?",
            "rentalid": null,
            "senderid": 35,
            "listingid": null,
            "messageid": 400,
            "requestid": null,
            "receiverid": 54,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T16:54:00",
            "message": "Tuesday or Thursday evening. I'm not certain about my move date yet.",
            "rentalid": null,
            "senderid": 54,
            "listingid": null,
            "messageid": 405,
            "requestid": null,
            "receiverid": 35,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-06-05 14:46:00.000",
            "message": "Tomorrow evening. I'm not certain about my move date yet.",
            "rentalid": null,
            "senderid": 54,
            "listingid": null,
            "messageid": 405,
            "requestid": null,
            "receiverid": 35,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T17:03:00",
            "message": "That's okay. I'll check those evenings and we can discuss timing after you've seen it.",
            "rentalid": null,
            "senderid": 35,
            "listingid": null,
            "messageid": 411,
            "requestid": null,
            "receiverid": 54,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-06-05 14:55:00.000",
            "message": "That's okay. I'll check tomorrow evening and we can discuss timing after you've seen it.",
            "rentalid": null,
            "senderid": 35,
            "listingid": null,
            "messageid": 411,
            "requestid": null,
            "receiverid": 54,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 123,
        "tenant_userid": 54,
        "rental_price": 2950,
        "deposit_price": 2950,
        "created_at": "2026-06-07 17:00:00.000",
        "accepted_at": "2026-06-08 18:00:00.000",
        "rental_date": "2026-06-08 18:00:00.000",
        "lease_expiry": "2028-03-08 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 35,
        "receiverid": 54,
        "date": "2026-06-07 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 2950,
          "date": "2026-06-08 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 2950,
          "date": "2026-07-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2950,
          "date": "2026-08-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2950,
          "date": "2026-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2950,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 125,
      "ownerid": 36,
      "tenantid": 55,
      "owner_name": "Ryan Low",
      "tenant_name": "Michelle Ng",
      "months": 13,
      "before_listing": {
        "listingid": 125,
        "owneruserid": 36,
        "tenantuserid": null,
        "name": "Comfortable Jurong East Flat - 115",
        "location": "115 JURONG EAST STREET 13, Singapore 600115",
        "price": 2450,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 125,
        "owneruserid": 36,
        "tenantuserid": 55,
        "name": "Comfortable Jurong East Flat - 115",
        "location": "115 JURONG EAST STREET 13, Singapore 600115",
        "price": 2450,
        "flagged": false,
        "created_at": "2026-07-03 18:00:00.000"
      },
      "users": [
        {
          "userid": 36,
          "name": "Ryan Low",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-06-11 13:00:00"
        },
        {
          "userid": 55,
          "name": "Michelle Ng",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-31 16:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T16:32:00",
            "message": "Hi, I'd like to enquire about the flat at block 115 Jurong East. Are viewings open?",
            "rentalid": null,
            "senderid": 55,
            "listingid": 125,
            "messageid": 384,
            "requestid": null,
            "receiverid": 36,
            "listing_name_snapshot": "Comfortable Jurong East Flat - 115",
            "listing_address_snapshot": "115 JURONG EAST STREET 13, Singapore 600115"
          },
          "after": {
            "date": "2026-07-04 14:20:00.000",
            "message": "Hi, I'd like to enquire about the flat at block 115 Jurong East. Are viewings open?",
            "rentalid": null,
            "senderid": 55,
            "listingid": 125,
            "messageid": 384,
            "requestid": null,
            "receiverid": 36,
            "listing_name_snapshot": "Comfortable Jurong East Flat - 115",
            "listing_address_snapshot": "115 JURONG EAST STREET 13, Singapore 600115"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T16:36:00",
            "message": "Hi Michelle, yes. Do you have a preferred viewing time?",
            "rentalid": null,
            "senderid": 36,
            "listingid": null,
            "messageid": 389,
            "requestid": null,
            "receiverid": 55,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-07-04 14:24:00.000",
            "message": "Hi Michelle, yes. Do you have a preferred viewing time?",
            "rentalid": null,
            "senderid": 36,
            "listingid": null,
            "messageid": 389,
            "requestid": null,
            "receiverid": 55,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T16:43:00",
            "message": "Sunday morning if possible. I'd like to see the layout before comparing my options.",
            "rentalid": null,
            "senderid": 55,
            "listingid": null,
            "messageid": 398,
            "requestid": null,
            "receiverid": 36,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-07-04 14:31:00.000",
            "message": "Sunday morning if possible. I'd like to see the layout before comparing my options.",
            "rentalid": null,
            "senderid": 55,
            "listingid": null,
            "messageid": 398,
            "requestid": null,
            "receiverid": 36,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T16:50:00",
            "message": "Sure. Are you thinking of moving this year?",
            "rentalid": null,
            "senderid": 36,
            "listingid": null,
            "messageid": 403,
            "requestid": null,
            "receiverid": 55,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-07-04 14:38:00.000",
            "message": "Sure. Are you thinking of moving this year?",
            "rentalid": null,
            "senderid": 36,
            "listingid": null,
            "messageid": 403,
            "requestid": null,
            "receiverid": 55,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T16:58:00",
            "message": "Yes, possibly December, but I still need to work out the dates.",
            "rentalid": null,
            "senderid": 55,
            "listingid": null,
            "messageid": 408,
            "requestid": null,
            "receiverid": 36,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-07-04 14:46:00.000",
            "message": "Yes, I could move soon, but I still need to work out the exact date.",
            "rentalid": null,
            "senderid": 55,
            "listingid": null,
            "messageid": 408,
            "requestid": null,
            "receiverid": 36,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T17:07:00",
            "message": "Understood. I'll check Sunday morning and reply here with a proposed time.",
            "rentalid": null,
            "senderid": 36,
            "listingid": null,
            "messageid": 413,
            "requestid": null,
            "receiverid": 55,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-07-04 14:55:00.000",
            "message": "Understood. I'll check Sunday morning and reply here with a proposed time.",
            "rentalid": null,
            "senderid": 36,
            "listingid": null,
            "messageid": 413,
            "requestid": null,
            "receiverid": 55,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 125,
        "tenant_userid": 55,
        "rental_price": 2450,
        "deposit_price": 2450,
        "created_at": "2026-07-06 17:00:00.000",
        "accepted_at": "2026-07-07 18:00:00.000",
        "rental_date": "2026-07-07 18:00:00.000",
        "lease_expiry": "2027-08-07 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 36,
        "receiverid": 55,
        "date": "2026-07-06 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 2450,
          "date": "2026-07-07 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 2450,
          "date": "2026-08-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2450,
          "date": "2026-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 2450,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    },
    {
      "listingid": 127,
      "ownerid": 37,
      "tenantid": 56,
      "owner_name": "Ananya Sharma",
      "tenant_name": "Fiona Chia",
      "months": 36,
      "before_listing": {
        "listingid": 127,
        "owneruserid": 37,
        "tenantuserid": null,
        "name": "Quiet Jurong East Flat - 201",
        "location": "201 JURONG EAST STREET 21, Singapore 600201",
        "price": 5400,
        "flagged": false,
        "created_at": "2026-10-12 07:10:06.598783"
      },
      "after_listing": {
        "listingid": 127,
        "owneruserid": 37,
        "tenantuserid": 56,
        "name": "Quiet Jurong East Flat - 201",
        "location": "201 JURONG EAST STREET 21, Singapore 600201",
        "price": 5400,
        "flagged": false,
        "created_at": "2026-08-02 18:00:00.000"
      },
      "users": [
        {
          "userid": 37,
          "name": "Ananya Sharma",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-05-11 14:00:00"
        },
        {
          "userid": 56,
          "name": "Fiona Chia",
          "role": "USER",
          "flagged": 0,
          "created_at": "2025-06-03 17:00:00"
        }
      ],
      "messages": [
        {
          "ordinal": 1,
          "before": {
            "date": "2026-10-12T16:36:00",
            "message": "Hello, I'm interested in the flat at block 201 Jurong East. Is it still available?",
            "rentalid": null,
            "senderid": 56,
            "listingid": 127,
            "messageid": 390,
            "requestid": null,
            "receiverid": 37,
            "listing_name_snapshot": "Quiet Jurong East Flat - 201",
            "listing_address_snapshot": "201 JURONG EAST STREET 21, Singapore 600201"
          },
          "after": {
            "date": "2026-08-03 14:20:00.000",
            "message": "Hello, I'm interested in the flat at block 201 Jurong East. Is it still available?",
            "rentalid": null,
            "senderid": 56,
            "listingid": 127,
            "messageid": 390,
            "requestid": null,
            "receiverid": 37,
            "listing_name_snapshot": "Quiet Jurong East Flat - 201",
            "listing_address_snapshot": "201 JURONG EAST STREET 21, Singapore 600201"
          }
        },
        {
          "ordinal": 2,
          "before": {
            "date": "2026-10-12T16:40:00",
            "message": "Hi Fiona, yes. Would you like to arrange a viewing?",
            "rentalid": null,
            "senderid": 37,
            "listingid": null,
            "messageid": 394,
            "requestid": null,
            "receiverid": 56,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-08-03 14:24:00.000",
            "message": "Hi Fiona, yes. Would you like to arrange a viewing?",
            "rentalid": null,
            "senderid": 37,
            "listingid": null,
            "messageid": 394,
            "requestid": null,
            "receiverid": 56,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 3,
          "before": {
            "date": "2026-10-12T16:47:00",
            "message": "Yes, please. I saw the asking rent was S$5,400 per month; is that still correct?",
            "rentalid": null,
            "senderid": 56,
            "listingid": null,
            "messageid": 401,
            "requestid": null,
            "receiverid": 37,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-08-03 14:31:00.000",
            "message": "Yes, please. I saw the asking rent was S$5,400 per month; is that still correct?",
            "rentalid": null,
            "senderid": 56,
            "listingid": null,
            "messageid": 401,
            "requestid": null,
            "receiverid": 37,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 4,
          "before": {
            "date": "2026-10-12T16:54:00",
            "message": "That's correct. What day would be convenient for a visit?",
            "rentalid": null,
            "senderid": 37,
            "listingid": null,
            "messageid": 406,
            "requestid": null,
            "receiverid": 56,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-08-03 14:38:00.000",
            "message": "That's correct. What day would be convenient for a visit?",
            "rentalid": null,
            "senderid": 37,
            "listingid": null,
            "messageid": 406,
            "requestid": null,
            "receiverid": 56,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 5,
          "before": {
            "date": "2026-10-12T17:02:00",
            "message": "Saturday afternoon would work. I want to view before discussing any rental terms.",
            "rentalid": null,
            "senderid": 56,
            "listingid": null,
            "messageid": 410,
            "requestid": null,
            "receiverid": 37,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-08-03 14:46:00.000",
            "message": "Tuesday afternoon would work. I want to view before discussing any rental terms.",
            "rentalid": null,
            "senderid": 56,
            "listingid": null,
            "messageid": 410,
            "requestid": null,
            "receiverid": 37,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        },
        {
          "ordinal": 6,
          "before": {
            "date": "2026-10-12T17:11:00",
            "message": "That's fine. I'll check Saturday and get back to you so we can confirm a viewing time.",
            "rentalid": null,
            "senderid": 37,
            "listingid": null,
            "messageid": 414,
            "requestid": null,
            "receiverid": 56,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          },
          "after": {
            "date": "2026-08-03 14:55:00.000",
            "message": "That's fine. I'll check Tuesday and get back to you so we can confirm a viewing time.",
            "rentalid": null,
            "senderid": 37,
            "listingid": null,
            "messageid": 414,
            "requestid": null,
            "receiverid": 56,
            "listing_name_snapshot": null,
            "listing_address_snapshot": null
          }
        }
      ],
      "rental": {
        "listingid": 127,
        "tenant_userid": 56,
        "rental_price": 5400,
        "deposit_price": 5400,
        "created_at": "2026-08-05 17:00:00.000",
        "accepted_at": "2026-08-06 18:00:00.000",
        "rental_date": "2026-08-06 18:00:00.000",
        "lease_expiry": "2029-08-06 18:00:00.000",
        "status": "active",
        "terminated_at": null,
        "payment_history": null
      },
      "offer": {
        "senderid": 37,
        "receiverid": 56,
        "date": "2026-08-05 17:00:00.000",
        "message": "Rental Offer"
      },
      "payments": [
        {
          "amount": 5400,
          "date": "2026-08-06 17:59:59.000",
          "convention": "initial_simulated_payment"
        },
        {
          "amount": 5400,
          "date": "2026-09-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        },
        {
          "amount": 5400,
          "date": "2026-10-01 10:00:00.000",
          "convention": "subsequent_calendar_month"
        }
      ]
    }
  ]
}
$manifest$::jsonb);

CREATE TEMP TABLE hist_d ON COMMIT DROP AS
SELECT d.* FROM hist_manifest,
jsonb_to_recordset(data->'discussions') AS d(
  listingid bigint, ownerid bigint, tenantid bigint, months integer,
  before_listing jsonb, after_listing jsonb, users jsonb,
  messages jsonb, rental jsonb, offer jsonb, payments jsonb);
ALTER TABLE hist_d ADD PRIMARY KEY (listingid);

CREATE TEMP TABLE hist_m ON COMMIT DROP AS
SELECT d.listingid AS discussion_id, (m->'before'->>'messageid')::bigint AS messageid,
       (m->>'ordinal')::integer AS ordinal,
       m->'before' AS before_row, m->'after' AS after_row
FROM hist_d d CROSS JOIN LATERAL jsonb_array_elements(d.messages) m;
ALTER TABLE hist_m ADD PRIMARY KEY (messageid);
CREATE TEMP TABLE hist_map (
  listingid bigint PRIMARY KEY, rentalid bigint UNIQUE NOT NULL
) ON COMMIT DROP;
CREATE TEMP TABLE hist_result (result text NOT NULL) ON COMMIT DROP;

-- Lock every public application table in a stable order so fingerprints also
-- catch unexpected trigger writes. Fail on contention rather than wait forever.
DO $lock$
DECLARE t record;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname
  LOOP
    EXECUTE format('LOCK TABLE public.%I IN SHARE ROW EXCLUSIVE MODE', t.relname);
  END LOOP;
END $lock$;

-- Convert timestamp columns to Singapore wall-clock JSON for exact comparisons
-- with either timestamp or timestamptz installations, retaining microseconds.
CREATE FUNCTION pg_temp.hist_norm(j jsonb, keys text[]) RETURNS jsonb
LANGUAGE plpgsql STABLE AS $fn$
DECLARE k text;
BEGIN
  FOREACH k IN ARRAY keys LOOP
    IF j ? k AND j->>k IS NOT NULL THEN
      j := jsonb_set(j, ARRAY[k], to_jsonb(to_char(
        (j->>k)::timestamptz AT TIME ZONE 'Asia/Singapore',
        'YYYY-MM-DD HH24:MI:SS.US')));
    END IF;
  END LOOP;
  RETURN j;
END $fn$;

CREATE FUNCTION pg_temp.hist_pick(j jsonb, expected jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $fn$
  SELECT jsonb_object_agg(key, j->key) FROM jsonb_object_keys(expected) key
$fn$;

CREATE FUNCTION pg_temp.hist_fingerprints() RETURNS TABLE(table_name text, digest text)
LANGUAGE plpgsql AS $fn$
DECLARE t record;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relkind IN ('r','p')
             AND c.relname NOT IN ('listings','chathistory','rentals','payment')
           ORDER BY c.relname
  LOOP
    RETURN QUERY EXECUTE format(
      'SELECT %L::text, md5(coalesce(string_agg(j::text, E''\n'' ORDER BY j::text), ''''))
       FROM (SELECT to_jsonb(t) AS j FROM public.%I t) s', t.relname, t.relname);
  END LOOP;
END $fn$;

CREATE FUNCTION pg_temp.hist_complete() RETURNS boolean
LANGUAGE plpgsql AS $fn$
DECLARE d record; p jsonb; r public.rentals%ROWTYPE; c public.chathistory%ROWTYPE;
BEGIN
  IF (SELECT count(*) FROM hist_map) <> 35 THEN RETURN false; END IF;
  FOR d IN SELECT x.*, map.rentalid FROM hist_d x JOIN hist_map map USING (listingid) LOOP
    SELECT * INTO r FROM public.rentals WHERE rentalid=d.rentalid;
    IF NOT FOUND OR pg_temp.hist_norm(pg_temp.hist_pick(to_jsonb(r), d.rental),
         ARRAY['created_at','accepted_at','rental_date','lease_expiry','terminated_at'])
       IS DISTINCT FROM pg_temp.hist_norm(d.rental,
         ARRAY['created_at','accepted_at','rental_date','lease_expiry','terminated_at'])
    THEN RETURN false; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.listings l WHERE l.listingid=d.listingid
       AND pg_temp.hist_norm(pg_temp.hist_pick(to_jsonb(l), d.after_listing), ARRAY['created_at'])
           = pg_temp.hist_norm(d.after_listing, ARRAY['created_at']))
    THEN RETURN false; END IF;
    IF EXISTS (SELECT 1 FROM hist_m m LEFT JOIN public.chathistory ch USING (messageid)
       WHERE m.discussion_id=d.listingid AND (ch.messageid IS NULL OR
         pg_temp.hist_norm(pg_temp.hist_pick(to_jsonb(ch), m.after_row), ARRAY['date'])
         IS DISTINCT FROM pg_temp.hist_norm(m.after_row, ARRAY['date'])))
    THEN RETURN false; END IF;
    IF (SELECT count(*) FROM public.chathistory WHERE rentalid=d.rentalid) <> 1
    THEN RETURN false; END IF;
    SELECT * INTO c FROM public.chathistory WHERE rentalid=d.rentalid;
    IF c.senderid IS DISTINCT FROM d.ownerid OR c.receiverid IS DISTINCT FROM d.tenantid
       OR c.message IS DISTINCT FROM 'Rental Offer' OR c.requestid IS NOT NULL
       OR c.listingid IS NOT NULL OR c.listing_name_snapshot IS NOT NULL
       OR c.listing_address_snapshot IS NOT NULL
       OR c.date::timestamp IS DISTINCT FROM (d.offer->>'date')::timestamp
    THEN RETURN false; END IF;
    FOR p IN SELECT value FROM jsonb_array_elements(d.payments) LOOP
      IF (SELECT count(*) FROM public.payment pay WHERE pay.rentalid=d.rentalid
          AND pay.date::timestamp=(p->>'date')::timestamp AND pay.amount=(p->>'amount')::bigint) <> 1
      THEN RETURN false; END IF;
    END LOOP;
    -- Later genuine payments may exist; the frozen history through cutoff
    -- must still be exact, including no extra same-month or undated payments.
    IF (SELECT count(*) FROM public.payment pay WHERE pay.rentalid=d.rentalid
        AND (pay.date IS NULL OR pay.date::timestamp < timestamp '2026-10-13'))
       <> jsonb_array_length(d.payments)
    THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END $fn$;

DO $seed$
DECLARE
  d record; u jsonb; r_id bigint; n bigint;
  t record; col record; idx text; source_att smallint; target_att smallint;
  old_chat_count bigint; old_listing_count bigint;
BEGIN
  -- Fail closed if the installed schema no longer matches the known contract.
  FOR col IN SELECT * FROM (VALUES
    ('rentals','rentalid','bigint'),('rentals','listingid','bigint'),
    ('rentals','tenant_userid','bigint'),('rentals','rental_price','bigint'),
    ('rentals','deposit_price','bigint'),('payment','payment_id','bigint'),
    ('payment','rentalid','bigint'),('payment','amount','bigint'),
    ('chathistory','messageid','bigint'),('chathistory','rentalid','bigint')
  ) v(tbl, field, typ) LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
       AND table_name=col.tbl AND column_name=col.field AND data_type=col.typ)
    THEN RAISE EXCEPTION 'Unsupported column: %.%', col.tbl,col.field; END IF;
  END LOOP;
  FOR col IN SELECT * FROM (VALUES
    ('rentals','created_at'),('rentals','accepted_at'),('rentals','rental_date'),
    ('rentals','lease_expiry'),('rentals','terminated_at'),('payment','date'),
    ('chathistory','date'),('listings','created_at'),('users','created_at')
  ) v(tbl, field) LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
       AND table_name=col.tbl AND column_name=col.field
       AND data_type IN ('timestamp without time zone','timestamp with time zone'))
    THEN RAISE EXCEPTION 'Unsupported timestamp: %.%', col.tbl,col.field; END IF;
  END LOOP;
  FOR col IN SELECT * FROM (VALUES
    ('rentals','rentalid'),('payment','payment_id'),('chathistory','messageid')
  ) v(tbl, field) LOOP
    IF pg_get_serial_sequence(format('public.%I',col.tbl),col.field) IS NULL
    THEN RAISE EXCEPTION 'Missing generated ID sequence: %.%',col.tbl,col.field; END IF;
  END LOOP;
  SELECT pg_get_indexdef(i.indexrelid) INTO idx FROM pg_index i
    WHERE i.indexrelid=to_regclass('public.uq_listing_current_rental')
      AND i.indrelid='public.rentals'::regclass AND i.indisunique
      AND i.indisvalid AND i.indisready AND i.indnkeyatts=1
      AND pg_get_indexdef(i.indexrelid,1,true)='listingid';
  IF idx IS NULL
     OR pg_get_expr((SELECT indpred FROM pg_index WHERE indexrelid=to_regclass('public.uq_listing_current_rental')),
                    'public.rentals'::regclass)
        NOT IN ('((status)::text = ANY ((ARRAY[''pending''::character varying, ''active''::character varying])::text[]))',
                '(status = ANY (ARRAY[(''pending''::character varying)::text, (''active''::character varying)::text]))',
                '(status = ANY (ARRAY[''pending''::text, ''active''::text]))')
  THEN RAISE EXCEPTION 'Missing or changed current-rental uniqueness index; inspect migration, do not bypass.';
  END IF;
  SELECT attnum INTO source_att FROM pg_attribute WHERE attrelid='public.rentals'::regclass AND attname='listingid';
  IF EXISTS (SELECT 1 FROM pg_index WHERE indrelid='public.rentals'::regclass AND indisunique
      AND indpred IS NULL AND indnkeyatts=1 AND indkey[0]=source_att)
  THEN RAISE EXCEPTION 'Obsolete global rental-listing uniqueness is still installed.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.rentals'::regclass
      AND conname='rentals_canonical_status' AND contype='c' AND convalidated
      AND pg_get_expr(conbin,conrelid) IN (
        '((status IS NOT NULL) AND ((status)::text = ANY ((ARRAY[''pending''::character varying, ''active''::character varying, ''terminated''::character varying])::text[])))',
        '((status IS NOT NULL) AND (status = ANY (ARRAY[(''pending''::character varying)::text, (''active''::character varying)::text, (''terminated''::character varying)::text])))',
        '((status IS NOT NULL) AND (status = ANY (ARRAY[''pending''::text, ''active''::text, ''terminated''::text])))'))
  THEN RAISE EXCEPTION 'Missing or changed canonical rental status constraint.'; END IF;
  FOR col IN SELECT * FROM (VALUES
    ('rentals','listingid','listings','listingid'),
    ('payment','rentalid','rentals','rentalid'),
    ('chathistory','rentalid','rentals','rentalid'),
    ('chathistory','senderid','users','userid'),
    ('chathistory','receiverid','users','userid'),
    ('chathistory','listingid','listings','listingid'),
    ('listings','tenantuserid','users','userid'),
    ('listings','owneruserid','users','userid')
  ) v(tbl,field,target_tbl,target_field) LOOP
    SELECT attnum INTO source_att FROM pg_attribute
      WHERE attrelid=format('public.%I',col.tbl)::regclass AND attname=col.field;
    SELECT attnum INTO target_att FROM pg_attribute
      WHERE attrelid=format('public.%I',col.target_tbl)::regclass AND attname=col.target_field;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype='f' AND convalidated
      AND conrelid=format('public.%I',col.tbl)::regclass AND conkey=ARRAY[source_att]
      AND confrelid=format('public.%I',col.target_tbl)::regclass AND confkey=ARRAY[target_att])
    THEN RAISE EXCEPTION 'Missing validated foreign key: %.%',col.tbl,col.field; END IF;
    IF col.tbl='rentals' AND col.field='listingid' AND NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE contype='f' AND convalidated
        AND conrelid='public.rentals'::regclass AND conkey=ARRAY[source_att]
        AND confrelid='public.listings'::regclass AND confkey=ARRAY[target_att]
        AND confdeltype='r')
    THEN RAISE EXCEPTION 'Rental history foreign key must restrict listing deletion.'; END IF;
  END LOOP;

  IF (SELECT count(*) FROM hist_d)<>35 OR (SELECT count(*) FROM hist_m)<>210
     OR (SELECT sum(jsonb_array_length(payments)) FROM hist_d)<>225
     OR (SELECT sum((p->>'amount')::bigint) FROM hist_d,
         LATERAL jsonb_array_elements(payments) p)<>1031250
     OR EXISTS (SELECT 1 FROM hist_d WHERE months NOT BETWEEN 12 AND 36 OR ownerid=tenantid)
  THEN RAISE EXCEPTION 'Manifest count, amount, duration, or identity invariant failed.'; END IF;
  IF localtimestamp < timestamp '2026-10-12 18:00:00'
  THEN RAISE EXCEPTION 'Seeded events would be in the future.'; END IF;

  FOR d IN SELECT * FROM hist_d LOOP
    FOR u IN SELECT value FROM jsonb_array_elements(d.users) LOOP
      IF NOT EXISTS (SELECT 1 FROM public.users live WHERE live.userid=(u->>'userid')::bigint
        AND pg_temp.hist_norm(pg_temp.hist_pick(to_jsonb(live),u),ARRAY['created_at'])
            = pg_temp.hist_norm(u,ARRAY['created_at'])
        AND live.role='USER' AND live.flagged=0)
      THEN RAISE EXCEPTION 'Participant missing, changed, or ineligible: %',u->>'userid'; END IF;
      IF (u->>'created_at')::timestamp > (d.after_listing->>'created_at')::timestamp
      THEN RAISE EXCEPTION 'Listing predates a participant: %',d.listingid; END IF;
    END LOOP;
    IF (d.rental->>'created_at')::timestamp >= (d.rental->>'accepted_at')::timestamp
       OR (d.rental->>'accepted_at')::timestamp > (d.rental->>'rental_date')::timestamp
       OR (d.rental->>'rental_date')::timestamp + make_interval(months=>d.months)
          <> (d.rental->>'lease_expiry')::timestamp
       OR (d.rental->>'lease_expiry')::timestamp <= timestamp '2026-10-12 18:00:00'
    THEN RAISE EXCEPTION 'Invalid rental chronology: %',d.listingid; END IF;
    IF (d.rental->>'rental_price')::bigint <= 0
       OR (d.rental->>'rental_price')::bigint <> (d.before_listing->>'price')::bigint
       OR (d.rental->>'deposit_price')::bigint <> (d.rental->>'rental_price')::bigint
       OR (d.rental->>'accepted_at')::timestamp > timestamp '2026-10-12 18:00:00'
       OR (SELECT count(DISTINCT date_trunc('month',(p->>'date')::timestamp))
           FROM jsonb_array_elements(d.payments) p) <> jsonb_array_length(d.payments)
       OR EXISTS (SELECT 1 FROM jsonb_array_elements(d.payments) p
           WHERE (p->>'amount')::bigint <> (d.rental->>'rental_price')::bigint)
    THEN RAISE EXCEPTION 'Invalid rent, deposit, or payment amounts: %',d.listingid; END IF;
    -- Independently derive every expected payment date from the approved rule.
    IF EXISTS (
      WITH expected AS (
        SELECT (d.rental->>'accepted_at')::timestamp - interval '1 second' AS paid_at
        UNION ALL
        SELECT s + interval '10 hours' FROM generate_series(
          date_trunc('month',(d.rental->>'rental_date')::timestamp)+interval '1 month',
          timestamp '2026-10-01',interval '1 month') s WHERE d.listingid<>115
      ), actual AS (
        SELECT (p->>'date')::timestamp AS paid_at FROM jsonb_array_elements(d.payments) p
      )
      (SELECT * FROM expected EXCEPT ALL SELECT * FROM actual)
      UNION ALL (SELECT * FROM actual EXCEPT ALL SELECT * FROM expected)
    ) THEN RAISE EXCEPTION 'Invalid monthly payment schedule: %',d.listingid; END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM hist_m m JOIN hist_d x ON x.listingid=m.discussion_id
       WHERE length(m.after_row->>'message') NOT BETWEEN 1 AND 255
       OR (m.after_row->>'date')::timestamp < (x.after_listing->>'created_at')::timestamp
       OR (m.after_row->>'date')::timestamp >= (x.rental->>'created_at')::timestamp
       OR (m.before_row - 'date' - 'message') IS DISTINCT FROM (m.after_row - 'date' - 'message')
       OR (x.listingid=115 AND m.before_row IS DISTINCT FROM m.after_row))
  THEN RAISE EXCEPTION 'Message preservation or chronology invariant failed.'; END IF;

  -- Locate previously inserted rentals by the full frozen contract, not IDs.
  INSERT INTO hist_map
  SELECT x.listingid,r.rentalid FROM hist_d x JOIN public.rentals r ON r.listingid=x.listingid
    AND pg_temp.hist_norm(pg_temp.hist_pick(to_jsonb(r),x.rental),
        ARRAY['created_at','accepted_at','rental_date','lease_expiry','terminated_at'])
      = pg_temp.hist_norm(x.rental,
        ARRAY['created_at','accepted_at','rental_date','lease_expiry','terminated_at']);
  IF pg_temp.hist_complete() THEN
    INSERT INTO hist_result VALUES ('ALREADY APPLIED: no changes');
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.rentals) OR EXISTS (SELECT 1 FROM public.payment)
  THEN RAISE EXCEPTION 'Expected empty rentals/payment or an exact completed batch; partial or changed state refused.'; END IF;

  FOR d IN SELECT * FROM hist_d LOOP
    IF NOT EXISTS (SELECT 1 FROM public.listings l WHERE l.listingid=d.listingid
        AND pg_temp.hist_norm(pg_temp.hist_pick(to_jsonb(l),d.before_listing),ARRAY['created_at'])
            = pg_temp.hist_norm(d.before_listing,ARRAY['created_at'])
        AND l.tenantuserid IS NULL AND l.flagged=false)
    THEN RAISE EXCEPTION 'Listing source state changed: %',d.listingid; END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM hist_m m LEFT JOIN public.chathistory c USING(messageid)
      WHERE c.messageid IS NULL OR
        pg_temp.hist_norm(pg_temp.hist_pick(to_jsonb(c),m.before_row),ARRAY['date'])
          IS DISTINCT FROM pg_temp.hist_norm(m.before_row,ARRAY['date']))
  THEN RAISE EXCEPTION 'Source chat missing or changed; obtain a fresh export.'; END IF;
  IF EXISTS (SELECT 1 FROM public.chathistory c JOIN hist_d x
       ON (c.senderid=x.ownerid AND c.receiverid=x.tenantid)
       OR (c.senderid=x.tenantid AND c.receiverid=x.ownerid)
       WHERE NOT EXISTS (SELECT 1 FROM hist_m m WHERE m.messageid=c.messageid))
  THEN RAISE EXCEPTION 'Unexpected extra chat for a selected pair.'; END IF;
  IF NOT (SELECT apply_changes FROM hist_settings) THEN
    INSERT INTO hist_result VALUES ('DRY RUN PASSED: no changes');
    RETURN;
  END IF;

  CREATE TEMP TABLE hist_protected ON COMMIT DROP AS SELECT * FROM pg_temp.hist_fingerprints();
  CREATE TEMP TABLE hist_listing_before ON COMMIT DROP AS SELECT listingid,to_jsonb(l) AS row FROM public.listings l;
  CREATE TEMP TABLE hist_chat_before ON COMMIT DROP AS SELECT messageid,to_jsonb(c) AS row FROM public.chathistory c;
  SELECT count(*) INTO old_chat_count FROM public.chathistory;
  SELECT count(*) INTO old_listing_count FROM public.listings;

  UPDATE public.listings l SET created_at=(x.after_listing->>'created_at')::timestamp,
    tenantuserid=x.tenantid FROM hist_d x WHERE l.listingid=x.listingid;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>35 THEN RAISE EXCEPTION 'Expected 35 listing updates, got %',n; END IF;
  UPDATE public.chathistory c SET date=(m.after_row->>'date')::timestamp,
    message=m.after_row->>'message' FROM hist_m m
    WHERE c.messageid=m.messageid AND m.discussion_id<>115;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>204 THEN RAISE EXCEPTION 'Expected 204 chat updates, got %',n; END IF;

  FOR d IN SELECT * FROM hist_d ORDER BY listingid LOOP
    INSERT INTO public.rentals
      (listingid,tenant_userid,rental_price,deposit_price,created_at,accepted_at,
       rental_date,lease_expiry,status,terminated_at,payment_history)
    VALUES (d.listingid,d.tenantid,(d.rental->>'rental_price')::bigint,
      (d.rental->>'deposit_price')::bigint,(d.rental->>'created_at')::timestamp,
      (d.rental->>'accepted_at')::timestamp,(d.rental->>'rental_date')::timestamp,
      (d.rental->>'lease_expiry')::timestamp,'active',NULL,NULL)
    RETURNING rentalid INTO r_id;
    INSERT INTO hist_map VALUES(d.listingid,r_id);
    INSERT INTO public.chathistory
      (date,message,senderid,receiverid,rentalid,requestid,listingid,
       listing_name_snapshot,listing_address_snapshot)
    VALUES ((d.offer->>'date')::timestamp,'Rental Offer',d.ownerid,d.tenantid,r_id,NULL,NULL,NULL,NULL);
    INSERT INTO public.payment (rentalid,amount,date)
    SELECT r_id,(p->>'amount')::bigint,(p->>'date')::timestamp
      FROM jsonb_array_elements(d.payments) p ORDER BY (p->>'date')::timestamp;
  END LOOP;

  SET CONSTRAINTS ALL IMMEDIATE;
  IF NOT pg_temp.hist_complete() OR (SELECT count(*) FROM public.rentals)<>35
     OR (SELECT count(*) FROM public.payment)<>225
     OR (SELECT count(*) FROM public.chathistory)<>old_chat_count+35
     OR (SELECT count(*) FROM public.listings)<>old_listing_count
  THEN RAISE EXCEPTION 'Post-apply batch validation failed; rolling back.'; END IF;
  IF EXISTS (SELECT 1 FROM hist_listing_before b LEFT JOIN public.listings l USING(listingid)
      LEFT JOIN hist_d x USING(listingid) WHERE l.listingid IS NULL OR
      CASE WHEN x.listingid IS NULL THEN to_jsonb(l) IS DISTINCT FROM b.row
           ELSE (to_jsonb(l)-'created_at'-'tenantuserid') IS DISTINCT FROM
                (b.row-'created_at'-'tenantuserid') END)
  THEN RAISE EXCEPTION 'Unexpected listing side effect; rolling back.'; END IF;
  IF EXISTS (SELECT 1 FROM hist_chat_before b LEFT JOIN public.chathistory c USING(messageid)
      LEFT JOIN hist_m m USING(messageid) WHERE c.messageid IS NULL OR
      CASE WHEN m.messageid IS NULL OR m.discussion_id=115 THEN to_jsonb(c) IS DISTINCT FROM b.row
           ELSE (to_jsonb(c)-'date'-'message') IS DISTINCT FROM (b.row-'date'-'message') END)
  THEN RAISE EXCEPTION 'Unexpected chat side effect; rolling back.'; END IF;
  IF EXISTS ((SELECT * FROM hist_protected EXCEPT SELECT * FROM pg_temp.hist_fingerprints())
       UNION ALL (SELECT * FROM pg_temp.hist_fingerprints() EXCEPT SELECT * FROM hist_protected))
  THEN RAISE EXCEPTION 'Protected table changed; rolling back.'; END IF;
  INSERT INTO hist_result VALUES ('APPLIED');
END $seed$;

SELECT result,35 AS planned_rentals,35 AS planned_offer_messages,
       225 AS planned_payments,1031250 AS planned_payment_total_sgd
FROM hist_result;
SELECT d.listingid,d.ownerid,d.tenantid,map.rentalid,
       d.rental->>'accepted_at' AS accepted_at,d.rental->>'rental_date' AS lease_start,
       d.months,jsonb_array_length(d.payments) AS payment_count,
       (SELECT sum((p->>'amount')::bigint) FROM jsonb_array_elements(d.payments) p) AS amount_sgd
FROM hist_d d LEFT JOIN hist_map map USING(listingid) ORDER BY d.listingid;

DROP FUNCTION pg_temp.hist_complete();
DROP FUNCTION pg_temp.hist_fingerprints();
DROP FUNCTION pg_temp.hist_pick(jsonb,jsonb);
DROP FUNCTION pg_temp.hist_norm(jsonb,text[]);
COMMIT;
