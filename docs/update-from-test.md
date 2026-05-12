Public Registration & Service-Based Onboarding Flow
Overview

The platform should not display a general “Create Account” button on the landing page.

Instead, account creation must be tied directly to a specific service selected by the user from the landing page.

Users begin the registration process by selecting a service they want to apply for.

Service Selection Flow

1. Landing Page Services

All services displayed on the landing page should be clickable.

Examples of services include:

Motor Park Management
Mass Transit Registration
AVIR Reports
Other available government/service applications

When a user clicks on any service, the platform should initiate a service-specific onboarding process.

Terms & Conditions / Requirements Step 2. Service Requirements Modal/Page

After selecting a service, the user should first see a Terms & Conditions / Requirements page related specifically to that service.

Example:

If a user selects Motor Park Management, the platform should display:

Required documents
Eligibility requirements
Application conditions
Important notices
Terms and policies related to Motor Park registration

This step acts as both:

a requirements checklist
and a consent/acknowledgement step

The user must:

Read the requirements
Agree to the terms
Click Continue

before proceeding to account creation.

Account Creation Flow 3. Public Account Registration

Once the user agrees to the service requirements, they are taken to the account creation page.

Required Fields
Full Name
Email Address
ASIN Number
Optional Fields
Phone Number
Authentication Logic 4. Login Credentials

The platform should not require passwords for authentication.

Users will log in using:

Email Address
ASIN Number
ASIN Validation Rules 5. ASIN Requirements

The ASIN number must follow these rules:

Must contain only numbers
Must be between 6 and 16 digits
No fixed pattern is required
Must be unique per user

Service Tracking Logic 6. Service Association

The system must track the specific service selected before account creation.

Example:

If a user starts registration through:

Motor Park Management

then their account should automatically be associated with that service.

Dashboard Personalization 7. Service-Specific Dashboard

After account creation and login:

The user should only see the service they registered for
The dashboard should be personalized based on the selected service

Example:

A user who registered through Motor Park Management should only see:

What concerns motor park

They should not see:

Mass Transit Registration
Accident Reporting (AVIR)

Other services
Application Progress Tracking 8. Resume Application Feature

The system should track the user’s progress throughout the application process.

If a user stops midway during application:

their current step should be saved automatically

When the user logs back in:

they should continue from the exact step where they stopped

Example:

If a user completed:

Step 1
Step 2

but stopped at:

Step 3

then after logging back in, the application should reopen at Step 3.

Expected User Journey
Example Flow
Motor Park Registration
User visits landing page
User clicks Motor Park Management
Terms & requirements page appears
User agrees and clicks Continue
User creates account using:
Name
Email
Optional phone number
ASIN
Account becomes linked to Motor Park service
User logs in using:
Email
ASIN
User dashboard displays only Motor Park-related processes
User starts application
System saves progress automatically
User can continue later from where they stopped
Core System Requirements Summary
Functional Requirements
No public “Create Account” button
Registration must begin from a selected service
Each service has unique terms/requirements
Users must agree before registration
Passwordless authentication using Email + ASIN
ASIN must be 6–16 numeric digits
Dashboard must be service-specific
Application progress must persist
Users can resume applications anytime
