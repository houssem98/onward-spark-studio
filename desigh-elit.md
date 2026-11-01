give me roadmap to copy past in calude code on how to design highly premium and very attractive motion stuf in my product  using all tools you cited with https://github.com/nexu-io/open-design and verify everthign using playwrihht this my desighn   front end now














Worked for 35s







I would treat this as a full visual transformation of BankIntelli, not a dashboard reskin. The goal is an institutional-grade banking intelligence product: visually distinctive, highly polished, responsive, and animated with purpose—not a flashy collection of gradients and floating cards.

I checked your repository's design roadmap, AGENTS.md, BANKINTELLI_LOOP.md, and package.json. Your existing React 19, TypeScript, TanStack, Tailwind 4, Radix UI and Recharts foundation should be preserved. Your roadmap already establishes the right direction: Institutional Intelligence—premium, composed, evidence-led and trustworthy.

I also checked OpenDesign. Its README describes Claude Code support through an MCP integration (od mcp install claude), plus reusable design systems, design templates, skills and plugins. I have included it as a design exploration and prototyping tool—not as something that should automatically replace your production frontend.

One limitation: I can inspect the repository, but I don't have a new frontend screenshot attached to this message. The instructions below make Claude Code inspect and capture the actual running application before changing it.
BANKINTELLI — ELITE PREMIUM FRONTEND TRANSFORMATION ROADMAP
Claude Code execution brief
Repository: https://github.com/houssem98/onward-spark-studio
Design exploration: https://github.com/nexu-io/open-design
Objective: Transform the existing BankIntelli frontend into a world-class, premium enterprise banking intelligence platform, with exceptional visual design, purposeful motion, outstanding usability, and automated browser verification.

1. YOUR MISSION
Act as a principal product designer, creative director, senior frontend architect, motion designer, and frontend QA engineer.

Transform the existing BankIntelli product into a visually distinctive enterprise platform suitable for:
- Bank CEOs and executive committees.
- Chief Risk Officers and credit directors.
- Financial crime and compliance teams.
- Data governance and data intelligence teams.
- AI and model risk governance teams.
- Banking strategy and performance analysts.
The design quality should be comparable in execution and polish to leading enterprise software such as Stripe, Linear, Ramp, Mercury, and Bloomberg.

These are design-quality references, not interfaces to copy.

The product must feel like a serious institutional intelligence platform, not a generic AI dashboard template.

The design objective:
- Premium visual identity.
- Excellent information hierarchy.
- Beautiful typography and financial data presentation.
- Carefully designed navigation and interactions.
- Sophisticated but restrained motion.
- High-quality charts and tables.
- Responsive layouts.
- Accessible interaction patterns.
- Excellent performance.
- Zero broken functionality.
Do not confuse visual complexity with premium design.

A premium banking interface must communicate confidence, clarity, precision, control, and trust.
2. NON-NEGOTIABLE REPOSITORY RULES
Before modifying anything:
1. Read AGENTS.md.
2. Read BANKINTELLI_LOOP.md.
3. Read docs/LOOP_GRAPH.md and docs/LOOP_CONVENTIONS.md if present.
4. Read BankIntelli_Elite_Premium_Design_Roadmap.md.
5. Inspect the complete existing frontend architecture.
6. Inspect package.json, routes, components, styles, assets, hooks, and tests.
7. Run the existing quality gate and record its baseline.
8. Start the application and inspect its actual rendered UI using Playwright.
Preserve the existing architecture:
- React 19.
- TypeScript.
- TanStack Start and Router.
- TanStack Query.
- Tailwind CSS 4.
- Existing Radix UI components.
- Existing Recharts visualizations.
- Existing Lucide icons.
- Existing Supabase integrations and business logic.
Do not migrate frameworks.

Do not replace functioning modules with static mockups.

Do not invent functionality, financial metrics, bank data, integrations, or AI capabilities.

Do not break authentication, authorization, routing, existing API contracts, data loading, or role permissions.

Do not overwrite existing business logic simply to make a screen visually easier to implement.

Git safety: This repository is connected to Lovable. Never rewrite published Git history, force-push, rebase published commits, amend published commits, or squash published history. Follow the repository's loop instructions, including its local-commit and no-push requirements.
3. PHASE ZERO — BASELINE AUDIT AND VISUAL DIAGNOSIS
Do not begin by changing CSS.

First establish exactly what currently exists.

Inspect:
- All application routes.
- Main application shell.
- Sidebar and top navigation.
- Dashboard and executive overview.
- All intelligence modules.
- Forms and filters.
- Dialogs, drawers, popovers and dropdowns.
- Charts and tables.
- Loading and skeleton states.
- Empty states.
- Error states.
- Responsive behavior.
- Typography and color tokens.
- Existing animation libraries.
- Existing component duplication.
- Existing accessibility issues.
Use Playwright to open the running application.

Capture screenshots of every important existing route.

Inspect the application at these viewport sizes:
Viewport	Purpose
1440 × 900	Main desktop experience
1280 × 800	Standard laptop
1024 × 768	Compact desktop/tablet
768 × 1024	Tablet
390 × 844	Mobile
360 × 800	Narrow mobileCreate:

docs/design-audit/BASELINE.md

Include:
- Existing visual strengths.
- Existing visual weaknesses.
- Inconsistent spacing.
- Typography problems.
- Weak visual hierarchy.
- Poor component patterns.
- Navigation problems.
- Unnecessary whitespace.
- Dense or difficult-to-read data.
- Broken responsive behavior.
- Missing loading and empty states.
- Motion opportunities.
- Accessibility issues.
- Performance concerns.
Assign severity: Critical, High, Medium, Low.

Create a route-by-route screenshot inventory.

Do not claim a page was tested if it was not opened and inspected.
4. DESIGN TOOLCHAIN — USE THE RIGHT TOOL FOR EACH JOB
Use the following tools as a coordinated design workflow.
A. OpenDesign — design exploration and prototyping
Repository:

https://github.com/nexu-io/open-design

OpenDesign should help explore and develop design directions before implementing them in the production application.

First verify whether the OpenDesign CLI is installed.

If available, inspect its documented commands and MCP integration.

The OpenDesign README documents Claude Code integration:

od mcp install claude

It also documents a dry-run preview:

od mcp install claude --print

Do not assume the CLI is installed. If it is unavailable, document the setup requirement rather than inventing commands.

Explore:
- Design systems.
- Design templates.
- Reusable UI atoms.
- Design refinement workflows.
- React export workflows.
- Relevant motion and interaction examples.
Select a suitable design system based on BankIntelli's institutional identity.

Use OpenDesign to explore at least three distinct visual directions:
1. Institutional Intelligence — restrained, analytical and executive.
2. Modern Financial Intelligence — sophisticated, data-rich and contemporary.
3. Premium Banking Operations — precise, functional and enterprise-oriented.
Compare them against the actual product requirements.

Select one coherent direction and document why it is superior.

Do not copy another product's identity or blindly import generated components.

OpenDesign is a design accelerator. The production application remains the source of truth.
B. UI UX Pro Max — design-system intelligence
Repository:

https://github.com/nextlevelbuilder/ui-ux-pro-max-skill

Use this skill to support:
- Design-system decisions.
- Typography selection.
- Color systems.
- Layout patterns.
- Component consistency.
- Responsive design.
- UX heuristics.
- Dashboard design decisions.
Inspect its current installation instructions before installing it.

Use its recommendations as design input, not as unquestionable rules.
C. Anthropic Frontend Design skill
Repository:

https://github.com/anthropics/skills/tree/main/skills/frontend-design

Use this skill for:
- Strong visual direction.
- Distinctive interface composition.
- Better typography.
- Refined component styling.
- Avoiding generic AI-generated dashboard aesthetics.
- More intentional visual details.
Read the actual SKILL.md before applying it.
D. Impeccable
Repository:

https://github.com/daskoon/impeccable

Inspect its current documentation and available commands before using it.

Use it as an additional design critique and refinement resource where appropriate.

Do not allow conflicting skills to generate multiple unrelated design systems.

Priority: one consistent BankIntelli design language takes precedence over any individual skill recommendation.
E. Figma — visual design and design-system reference
Website:

https://www.figma.com/

Use Figma where available to:
- Explore layout directions.
- Define the visual identity.
- Document design tokens.
- Review high-fidelity screen concepts.
- Compare alternative dashboard compositions.
- Maintain reusable design references.
Do not assume access to a Figma account, file, or API.

If no Figma integration is configured, use it as an optional manual design-review workflow.

The production UI must remain implementable and maintainable in the existing codebase.
F. Motion — premium interface animation
Documentation:

https://motion.dev/

Inspect whether a compatible Motion package already exists.

If not, evaluate whether installing motion is justified.

Use React Motion APIs where appropriate.

Motion should improve the product's perceived quality and communicate interaction state.

Do not animate everything.
G. shadcn/ui — component patterns
Documentation:

https://ui.shadcn.com/

Use shadcn/ui as a component design and implementation reference.

Do not replace the existing Radix UI foundation unnecessarily.

Inspect existing components before creating replacements.

Use accessible primitives and establish a consistent component API.
H. Playwright — mandatory browser verification
Documentation:

https://playwright.dev/

Playwright is not optional.

Use it to verify the actual application after every major implementation phase.

Do not consider a visual change complete merely because TypeScript compiles.
I. WCAG accessibility
Reference:

https://www.w3.org/WAI/standards-guidelines/wcag/

Target WCAG 2.2 AA where applicable.

Check:
- Contrast.
- Keyboard accessibility.
- Visible focus states.
- Semantic HTML.
- Accessible names.
- Dialog focus management.
- Reduced-motion preferences.
- Form labels and errors.
- Chart alternatives.
- Screen-reader-friendly status communication.
5. DESIGN DIRECTION — INSTITUTIONAL INTELLIGENCE
Create one coherent design language.
Visual personality
BankIntelli should feel:
- Institutional.
- Intelligent.
- Premium.
- Analytical.
- Precise.
- Calm.
- Modern.
- Reliable.
- Sophisticated.
Avoid:
- Excessive gradients.
- Neon colors.
- Excessive glassmorphism.
- Huge floating cards.
- Unnecessary rounded containers.
- Excessive shadows.
- Oversized decorative headings.
- Random animations.
- Generic AI illustrations.
- Unnecessary 3D elements.
- Excessive empty space.
- Unreadable financial tables.
Color direction
Explore a sophisticated palette built around:
- Deep navy / ink.
- Warm white.
- Soft neutral backgrounds.
- Muted blue.
- Restrained teal.
- Subtle gray borders.
- Carefully controlled semantic colors.
Semantic meaning:
- Green: positive or healthy.
- Amber: attention required.
- Red: critical issue.
- Gray: unknown, unavailable or neutral.
- Blue: information or active interaction.
Never communicate important status through color alone.
Typography
Select one primary interface font and, if justified, a complementary numerical treatment.

Evaluate:
- Inter.
- Geist.
- Other suitable professional sans-serif families.
Financial numbers must use tabular numerals.

Establish distinct typography for:
- Page titles.
- Section headings.
- KPI values.
- Table values.
- Labels.
- Source metadata.
- Supporting text.
- Evidence and methodology.
Ensure numbers, percentages, currencies and negative values are formatted consistently.
Layout
Design a cohesive application shell:
- Refined sidebar.
- Carefully designed top navigation.
- Clear page hierarchy.
- Consistent page headers.
- Contextual actions.
- Breadcrumbs where useful.
- Search and command palette.
- User and organization context.
- Data freshness indicators.
- Responsive navigation.
Use a consistent spacing scale.

Avoid turning every single piece of information into a separate card.

Use visual grouping, tables, panels, dividers and whitespace intelligently.
6. BUILD A CENTRALIZED DESIGN SYSTEM
Create or improve a centralized design-token architecture.

Possible structure, adapted to the existing project:

src/styles/design-tokens.css

src/components/ui/

src/components/layout/

src/components/motion/

src/lib/design/

Do not create duplicate directories if equivalent architecture already exists.

Define tokens for:
- Backgrounds.
- Foregrounds.
- Primary and secondary colors.
- Borders.
- Semantic states.
- Typography.
- Font weights.
- Spacing.
- Radii.
- Shadows.
- Focus rings.
- Z-index layers.
- Layout widths.
- Table density.
- Animation durations.
- Easing functions.
- Chart colors.
Create reusable primitives for:
- Buttons.
- Inputs.
- Selects.
- Search fields.
- Tabs.
- Badges.
- Tooltips.
- Dialogs.
- Drawers.
- Dropdowns.
- Cards.
- Tables.
- KPI displays.
- Chart containers.
- Loading skeletons.
- Empty states.
- Error states.
- Source indicators.
- Evidence panels.
Each primitive must have consistent states:
- Default.
- Hover.
- Focus.
- Active.
- Disabled.
- Loading.
- Error, where applicable.
Do not add components just to increase component count.

The objective is consistency and maintainability.
7. MOTION DESIGN SYSTEM — MAKE THE PRODUCT FEEL ALIVE
This is a major part of the transformation.

Create a centralized motion system rather than implementing random animations independently.

Use Motion for React where appropriate.

Define reusable motion presets.

Suggested timing guidelines:
Interaction	Target duration
Hover feedback	100–160 ms
Button interaction	120–180 ms
Tooltip	120–180 ms
Dropdown	160–220 ms
Dialog	180–260 ms
Page transition	180–280 ms
Chart reveal	350–650 ms
Complex workflow transition	250–400 msTreat these as starting points, not universal requirements.
A. Application entrance
Design a subtle entrance for the application:
- Navigation appears cleanly.
- Main content enters with a short transition.
- Important page elements appear in a deliberate sequence.
- No long intro animation.
- No delay before the user can interact.
B. Sidebar
Implement:
- Smooth active-navigation indicator.
- Subtle hover feedback.
- Animated collapse and expansion.
- Clear icon and label alignment.
- Smooth nested navigation.
- Tooltips when collapsed.
C. KPI cards
Implement:
- Subtle entrance.
- Number transitions when values genuinely update.
- Small hover elevation where useful.
- Carefully controlled emphasis for important values.
- Clear loading behavior.
Do not continuously animate financial values.

Never animate numbers in a way that misrepresents the underlying data.
D. Charts
Use Recharts and Motion carefully.

Consider:
- Controlled line drawing.
- Smooth bar appearance.
- Subtle chart transitions after filter changes.
- Highlighting the selected period.
- Clear tooltip transitions.
- Animated range selection.
Charts must remain readable and accurate.

Do not use animation to obscure changes in scale, values, or comparison baselines.
E. Tables
Implement:
- Row hover feedback.
- Selected-row indication.
- Smooth expansion of detail panels.
- Loading skeletons.
- Filter-state feedback.
- Clear sorting indicators.
- Sticky headers where appropriate.
Avoid animating every table row on every render.
F. Dialogs and drawers
Implement:
- Subtle entrance and exit.
- Appropriate overlay transitions.
- Correct focus behavior.
- Escape-to-close behavior.
- Background interaction management.
G. Command palette
Create a refined command/search experience if the product's existing architecture supports it.

Include:
- Keyboard shortcut.
- Search input.
- Grouped results.
- Keyboard navigation.
- Selected-result state.
- Smooth opening and closing.
Do not introduce fake navigation actions.
H. Loading and progress
Create purposeful states for:
- Data loading.
- AI analysis.
- Report generation.
- Investigation processing.
- Data synchronization.
- Failed requests.
- Retry actions.
Show genuine workflow progress only.

Do not invent progress percentages or pretend that a task is complete.
I. Microinteractions
Polish:
- Buttons.
- Filters.
- Tabs.
- Toggles.
- Dropdowns.
- Tooltips.
- Search.
- Notifications.
- Expandable panels.
- Copy actions.
- Export actions.
- Form validation.
Every animation must have a reason.
J. Reduced motion
Respect:

prefers-reduced-motion: reduce

Provide accessible alternatives for users who disable motion.

Avoid large movement, flashing, excessive parallax, or motion that interferes with reading.
8. MODULE-BY-MODULE TRANSFORMATION
Do not redesign all modules as unrelated screens.

They must share the same design language.
Module 1 — Executive Overview
Purpose: help executives understand what requires attention.

Design:
- High-quality executive page header.
- Four to six decision-driving KPIs.
- Performance trends.
- Credit portfolio health.
- Important risk exposures.
- Data-quality exceptions.
- Model-governance alerts.
- Needs-attention queue.
- Clear period comparisons.
- Start-investigation action.
Use sophisticated charts and restrained visual hierarchy.
Module 2 — Performance and Peer Intelligence
Design:
- Bank performance scorecards.
- Peer comparison tables.
- Metric definitions.
- Period comparisons.
- Variance analysis.
- Performance trends.
- Benchmark distribution where data permits.
- Source and methodology information.
Do not fabricate unavailable competitor figures.
Module 3 — Credit Intelligence
Design:
- Portfolio health.
- Credit origination.
- Delinquency.
- Non-performing loans.
- Exposure concentration.
- Risk segmentation.
- Vintage and cohort analysis.
- Loss and recovery metrics.
- Scenario analysis where implemented.
Separate observed data from model outputs and scenarios.
Module 4 — Financial Crime
Design:
- Investigation queue.
- Alert status.
- Case details.
- Investigator ownership.
- Timeline.
- Evidence.
- Reviewer decisions.
- Audit history.
Prioritize efficient investigator workflows.

Avoid sensational visuals.
Module 5 — Data Intelligence
Design:
- Data catalog.
- Data quality.
- Data lineage.
- Ownership.
- Classification.
- Freshness.
- Certification.
- Remediation workflows.
Distinguish verified lineage from illustrative or manually entered lineage.
Module 6 — AI and Model Governance
Design:
- Model inventory.
- Validation status.
- Model ownership.
- Monitoring.
- Drift indicators.
- Performance history.
- Approval workflow.
- Remediation.
- Audit trail.
Clearly distinguish monitoring signals from confirmed model failures.
Module 7 — Executive Investigation
This is the signature BankIntelli experience.

Design a high-quality workspace where a banking executive can ask:

"Why did our credit division underperform its peer benchmark in FY2025?"

The interface should organize:
1. Question and reporting scope.
2. Executive finding.
3. KPI comparisons.
4. Variance bridge.
5. Evidence and sources.
6. Measured facts versus hypotheses.
7. Contradictions and missing data.
8. Recommended actions.
9. Ownership and due dates.
10. Report history and reviewer decisions.
Every finding should lead to its supporting evidence.

Every metric should expose its definition, calculation, period and source where supported.

Do not visually label AI-generated claims as verified without the application's actual verification policy.
9. CHARTS AND FINANCIAL DATA PRESENTATION
Use Recharts where it is already appropriate.

Build a consistent chart system.

Prioritize:
- Line charts.
- Bar charts.
- Stacked bars.
- Area charts where useful.
- Variance bridges.
- Peer comparisons.
- Trend distributions.
- Risk segmentation.
- Portfolio concentration.
Each chart must communicate:
- Title.
- Metric.
- Unit.
- Reporting period.
- Comparison baseline.
- Source.
- Freshness.
- Tooltip details.
- Empty state.
- Loading state.
Avoid decorative charts that do not support a decision.

Make chart values understandable without relying exclusively on color.
10. RESPONSIVE DESIGN
Desktop is the primary banking workstation experience, but the interface must remain usable on smaller devices.

Implement and verify:
- Desktop sidebar.
- Compact navigation.
- Mobile navigation.
- Responsive tables.
- Horizontal scrolling only where justified.
- Stacked layouts.
- Responsive charts.
- Mobile-friendly filters.
- Accessible dialogs and drawers.
Do not simply shrink desktop screens.

Reconsider information hierarchy at each breakpoint.
11. PERFORMANCE AND ENGINEERING QUALITY
Do not sacrifice performance for visual effects.

Check:
- Unnecessary component re-renders.
- Excessive animation.
- Large image assets.
- Unnecessary dependencies.
- Bundle growth.
- Chart rendering.
- Layout shifts.
- Slow page transitions.
- Expensive effects.
- Unnecessary client-side JavaScript.
Use CSS transitions for simple interactions when they are sufficient.

Use Motion for interactions that genuinely benefit from its capabilities.

Use lazy loading where appropriate.

Avoid adding a large animation library for effects that can be achieved with existing tools.

Inspect bundle size before and after the transformation.
12. PLAYWRIGHT — MANDATORY END-TO-END VISUAL VERIFICATION
This phase is critical.

Inspect the existing test setup first.

If Playwright is already installed, use the existing setup.

If it is not installed, evaluate and add the minimum required Playwright tooling without disturbing Vitest or existing test scripts.

Create a maintainable browser-test structure, adapted to the project:

tests/e2e/

tests/e2e/navigation.spec.ts

tests/e2e/responsive.spec.ts

tests/e2e/interactions.spec.ts

tests/e2e/accessibility.spec.ts

tests/e2e/visual-regression.spec.ts

playwright.config.ts

Do not duplicate an existing test architecture.
A. Route verification
For every real application route:
- Open the page.
- Verify successful rendering.
- Check for uncaught JavaScript errors.
- Check failed network requests.
- Verify important page headings.
- Verify the correct navigation state.
- Verify that the page does not render blank.
- Capture a screenshot.
Do not invent routes. Discover them from the actual route tree.
B. Interaction verification
Test:
- Sidebar navigation.
- Sidebar collapse.
- Dropdowns.
- Dialogs.
- Drawers.
- Tabs.
- Filters.
- Search.
- Sorting.
- Pagination.
- Forms.
- Keyboard navigation.
- Command palette, if implemented.
- Export actions, if implemented.
- Existing important business workflows.
Verify actual behavior, not just the presence of clickable elements.
C. Responsive verification
Run browser tests at:
- 1440 × 900.
- 1280 × 800.
- 1024 × 768.
- 768 × 1024.
- 390 × 844.
- 360 × 800.
Look for:
- Horizontal overflow.
- Broken navigation.
- Overlapping elements.
- Clipped content.
- Unreadable typography.
- Broken chart layouts.
- Hidden actions.
- Inaccessible controls.
D. Visual regression
Capture baseline and post-change screenshots.

Use stable test data and controlled browser state where possible.

Compare screenshots route by route.

Do not approve a visual regression simply because a screenshot was generated.

Investigate differences in:
- Layout.
- Alignment.
- Typography.
- Spacing.
- Color.
- Component sizing.
- Chart presentation.
- Responsive behavior.
Avoid brittle visual tests that fail because of uncontrolled timestamps, random data, or animations.

Disable or stabilize animations for screenshot comparison, while testing motion behavior separately.
E. Accessibility checks
Test:
- Keyboard-only navigation.
- Focus visibility.
- Semantic headings.
- Accessible labels.
- Dialog behavior.
- Form errors.
- Contrast.
- Reduced motion.
- Appropriate accessible chart descriptions.
Use automated accessibility tooling if already available or if adding it is justified.

Automated checks do not replace manual review.
F. Motion verification
Test actual interactions:
- Navigation transitions.
- Dropdowns.
- Dialogs.
- Drawers.
- KPI updates.
- Chart transitions.
- Expandable rows.
- Reduced-motion mode.
Check for:
- Jank.
- Flickering.
- Layout shifts.
- Stuck animations.
- Unnecessary repeated animation.
- Interactions blocked during transitions.
Do not claim animation performance has been measured unless it has actually been measured.
G. Playwright evidence
Save screenshots and test results in a documented location, for example:

artifacts/design-verification/

Keep generated evidence out of production bundles.

Produce:

docs/design-audit/PLAYWRIGHT_REPORT.md

The report must include:
- Routes tested.
- Viewports tested.
- Interactions tested.
- Tests passed.
- Tests failed.
- Console errors.
- Network failures.
- Accessibility findings.
- Visual regressions.
- Screenshots.
- Known limitations.
13. EXECUTION STRATEGY — DO NOT CHANGE EVERYTHING AT ONCE
Work in controlled phases.
Phase 1 — Audit
Inspect the codebase and current UI.

Deliver:
- Baseline report.
- Route inventory.
- Screenshot inventory.
- Design gap analysis.
- Dependency audit.
- Test baseline.
No visual redesign yet.
Phase 2 — Design exploration
Use OpenDesign, UI UX Pro Max, Anthropic Frontend Design, and Figma where available.

Develop and compare three design directions.

Deliver:

docs/design/ART_DIRECTION.md

docs/design/DESIGN_SYSTEM.md

docs/design/MOTION_SYSTEM.md
Phase 3 — Foundation
Implement:
- Design tokens.
- Typography.
- Color system.
- Surface system.
- Component primitives.
- Responsive layout foundation.
- Motion primitives.
- Accessibility foundations.
Test the foundation before proceeding.
Phase 4 — Application shell
Transform:
- Sidebar.
- Top navigation.
- Breadcrumbs.
- Search.
- Page headers.
- Organization context.
- User controls.
- Responsive navigation.
Verify all existing routes still work.
Phase 5 — Executive Overview
Implement the highest-quality executive experience.

Use it as the design benchmark for the rest of the product.
Phase 6 — Intelligence modules
Transform each existing module in controlled, independently testable tasks.

Preserve its functionality and data contracts.
Phase 7 — Signature investigation workspace
Deliver the defining BankIntelli experience.

Prioritize information architecture, evidence presentation and interaction quality.
Phase 8 — Motion refinement
Add the complete motion system.

Audit every animation for usefulness, accessibility and performance.
Phase 9 — Responsive and accessibility refinement
Test all important routes and interactions at all target viewports.

Fix issues rather than documenting avoidable failures as acceptable.
Phase 10 — Final quality gate
Run the complete existing project quality gate:

npm run gate

Run Playwright tests.

Run the production build.

Review screenshots.

Review console and network failures.

Review bundle changes.

Fix regressions.

Do not claim success unless the corresponding command or browser test actually passed.
14. ACCEPTANCE CRITERIA
The transformation is complete only when the following are demonstrated.
Area	Required result
Design identity	One coherent BankIntelli visual system
Typography	Consistent and readable
Color	Restrained, accessible semantic palette
Navigation	Clear, responsive and functional
Components	Consistent reusable primitives
Motion	Purposeful and accessible
Charts	Readable and accurate
Tables	Professional financial-data presentation
Responsive	All target viewports checked
Accessibility	WCAG 2.2 AA-oriented review
Functionality	Existing business workflows preserved
Performance	No unjustified performance regression
TypeScript	Typecheck passes
Lint	Lint passes
Unit tests	Existing tests pass
Build	Production build passes
Playwright	Required browser checks pass
Visual evidence	Before/after screenshots retainedDo not invent numerical design scores.

Report actual test counts and actual failures.
15. FINAL DELIVERABLES
Create or update:
- docs/design-audit/BASELINE.md
- docs/design/ART_DIRECTION.md
- docs/design/DESIGN_SYSTEM.md
- docs/design/MOTION_SYSTEM.md
- docs/design-audit/PLAYWRIGHT_REPORT.md
- docs/design-audit/FINAL_REPORT.md
Also provide:
1. Summary of the design transformation.
2. Routes redesigned.
3. Components created or improved.
4. Motion effects implemented.
5. Dependencies added or removed, with justification.
6. Playwright test results.
7. Typecheck, lint, test and build results.
8. Before/after screenshots.
9. Remaining issues.
10. Any functionality that could not be verified.
16. HOW YOU MUST WORK
You are not allowed to complete this as one giant uncontrolled rewrite.

For each task:
1. Inspect the relevant code.
2. Identify the intended design improvement.
3. Identify potential functional regressions.
4. Implement the smallest coherent change.
5. Run the relevant tests.
6. Verify the actual browser result.
7. Capture evidence.
8. Record the outcome.
9. Continue to the next task only when the current task is stable.
Do not install every tool or package simply because it appears in this document.

Inspect compatibility, licensing, maintenance, and actual need before adding dependencies.

Do not use OpenDesign-generated code without reviewing its quality, accessibility, security, and compatibility with this repository.

Do not replace existing production data with invented demo data.

Do not silently remove features.

Do not hide failing tests.

Do not stop after producing a visually attractive homepage. The entire application must become coherent.
FINAL CREATIVE DIRECTION
The final BankIntelli product should feel like a premium institutional banking intelligence workspace.

Imagine an executive opening the platform for the first time.

The navigation feels deliberate.

The typography feels expensive and professional.

The dashboard communicates important information immediately.

The financial charts are precise.

The tables are exceptionally readable.

The interactions feel smooth and responsive.

The motion is subtle, elegant and purposeful.

The evidence is easy to inspect.

The entire product feels like one carefully engineered enterprise platform.

The standard is not "looks modern." The standard is "looks and behaves like a world-class enterprise banking product."

Begin with Phase 1. Inspect the actual repository and browser experience, establish the baseline, and then execute the roadmap phase by phase.




How I recommend you run it
1. Open your local repository in Claude Code.
2. Paste the roadmap above as the main execution brief.
3. Let Claude complete Phase 1 first. Review the audit before allowing it to make large design changes.
4. Require screenshots and Playwright evidence after each major phase.
5. Do not let it push changes to GitHub; your repository instructions explicitly say to commit locally and never push.
Important distinction: OpenDesign, Figma, and the design skills help produce and refine the design direction. Motion implements the interaction language. Playwright verifies what actually runs in the browser. None of those tools independently guarantees a premium result—the quality comes from the design decisions and the verification loop.

















i want motion like in this medium page https://medium.com/%40gaurigiri777/from-confusing-loan-approvals-to-explainable-ai-building-a-credit-default-risk-prediction-dcfa65227fdf , addthis stuff to roadmap














Worked for 29s







I’ll add this as a dedicated explainable-AI motion system in the BankIntelli roadmap—not just generic page animations. The goal is to make credit-risk analysis feel alive: users should be able to follow how a risk signal becomes a prediction, which factors influenced it, and how the system reaches an explainable result.

I inspected the article. Its strongest design ideas are the SHAP beeswarm plot, feature-importance ranking, and individual-customer SHAP waterfall—visualizations that show which factors increase or reduce a prediction and by how much. 
medium.com


One important distinction: the article explains these visualizations; it does not establish a particular animation style. The roadmap below translates those concepts into a polished, restrained motion experience for BankIntelli.
BANKINTELLI — MOTION & EXPLAINABLE AI ROADMAP EXTENSION
Objective
Extend the existing BankIntelli Elite Premium Frontend Transformation Roadmap with a sophisticated, interactive motion system inspired by the explainable credit-risk analysis in this reference:

https://medium.com/@gaurigiri777/from-confusing-loan-approvals-to-explainable-ai-building-a-credit-default-risk-prediction-dcfa65227fdf

Do not replace the existing roadmap. Integrate this extension into its design-system, motion, credit-intelligence, data-visualization, and Playwright phases.

The experience should communicate:
- How financial data becomes meaningful risk indicators.
- How a model produces a prediction.
- Which factors influence that prediction.
- Which factors increase or decrease the estimated risk.
- How analysts can investigate and challenge the result.
The design must feel like premium institutional banking software: precise, restrained, sophisticated, and trustworthy. Avoid flashy animations, excessive gradients, neon colors, and gimmicky effects.

1. Build an Explainable Credit Intelligence Experience
Redesign the credit intelligence experience around a visual analytical journey:
1. Financial profile and input indicators.
2. Data-quality and completeness assessment.
3. Engineered financial ratios and indicators.
4. Model prediction and evaluation context.
5. Global feature importance.
6. Individual prediction explanation.
7. Analyst investigation and review.
Represent this as a coherent interface, not a decorative animation disconnected from the underlying data.
Motion behavior
- Reveal each analytical stage as it enters the viewport.
- Use subtle connecting-line animations to communicate progression.
- Animate numerical values only when their underlying values are loaded or updated.
- Use staggered transitions for related analytical elements.
- Keep transitions short, purposeful, and interruptible.
- Make loading, completed, unavailable, and failed states visually distinct.
Never simulate model execution or claim that an analysis is running when it is not.
2. SHAP Visualization Motion
Implement the following visualizations if the backend provides genuine SHAP values or equivalent explainability data.
A. SHAP feature importance
Create a ranked horizontal-bar visualization.

Motion:
- Bars grow from zero to their actual values.
- Rankings appear progressively.
- Labels and values enter with subtle staggered transitions.
- Hovering or focusing a feature highlights the corresponding explanation.
- Clicking a feature opens its detailed explanation.
Display:
- Feature name.
- Importance value.
- Direction or impact information when available.
- Definition and source of the underlying feature.
Do not invent SHAP values or use random animation values.
B. SHAP beeswarm
Create an interactive feature-impact visualization.

Motion:
- Reveal feature groups progressively.
- Animate genuine data points into their final positions.
- Highlight the selected feature.
- Allow users to inspect individual points.
- Display a tooltip with the actual feature value and SHAP contribution.
- Explain the color encoding with a persistent legend.
Interaction:
- Hover or keyboard-focus a point to inspect it.
- Select a feature to isolate its contribution.
- Reset the visualization to its original state.
The animation must preserve the real data distribution. Never move points to visually exaggerate a relationship.
C. Individual SHAP waterfall
Make this the flagship interaction.

The waterfall should explain one selected customer or credit case, using actual available explanation data.

Motion sequence:
1. Show the baseline prediction.
2. Introduce the first contributing feature.
3. Animate its contribution from the current cumulative value.
4. Continue through the remaining features.
5. Finish at the final model output.
6. Reveal a concise explanation of the strongest contributors.
Use distinct, accessible visual encodings for factors that increase and decrease estimated risk.

Interactions:
- Play the explanation.
- Pause and resume.
- Move between contribution steps.
- Select an individual feature.
- Reset the explanation.
- Inspect exact values and definitions.
The final result must reconcile mathematically with the supplied baseline and contributions, subject to the model's documented output scale and rounding.

Do not imply that SHAP explanations establish causation or independently justify a credit decision.
3. Add Premium Motion to the Credit Dashboard
Implement these interactions where relevant:

Risk indicator
- Smoothly transition between actual risk states.
- Animate the indicator only when a new result arrives.
- Keep the numeric value readable throughout.
- Include a clear label and explanation of the underlying measure.
Financial ratios
- Animate ratio bars and comparison indicators.
- Reveal formulas and definitions on demand.
- Highlight meaningful deviations from the selected benchmark.
- Never animate a value to imply an improvement that did not occur.
Credit exposure
- Use progressive reveals for portfolio segments.
- Animate chart transitions when changing reporting periods.
- Preserve accurate axes, units, and totals.
Risk distribution
- Use subtle chart transitions to show changes in portfolio composition.
- Support filtering by segment, product, period, and other actual available dimensions.
Investigation drawer
- Use a restrained slide-in transition.
- Preserve the user's selected customer, feature, or portfolio context.
- Avoid unnecessary page reloads.
4. Extend the Motion Design System
Use Motion (motion.dev) where justified by the existing React architecture.

Create reusable motion primitives rather than writing unrelated animation logic in every component.

Suggested components:
- RevealOnView
- StaggerContainer
- StaggerItem
- AnimatedMetric
- AnimatedBar
- AnimatedChart
- FeatureContribution
- WaterfallStep
- InvestigationDrawer
- MotionPageTransition
Define shared tokens for:
- Duration.
- Easing.
- Stagger intervals.
- Entrance and exit behavior.
- Chart transitions.
- Interaction feedback.
Motion must support:
- prefers-reduced-motion.
- Keyboard navigation.
- Screen readers.
- Touch interactions.
- Low-powered devices.
Do not animate every card or every element. Motion should communicate hierarchy, relationships, changes, and analytical progression.
5. Make the Experience Feel Like a Premium Financial Intelligence Platform
The desired experience:
- Clean, editorial typography.
- Strong information hierarchy.
- Restrained color palette.
- Precise data visualization.
- Fine borders and carefully controlled shadows.
- Smooth transitions.
- Clear analytical storytelling.
- High-quality empty, loading, and error states.
Avoid:
- Neon dashboards.
- Excessive glassmorphism.
- Constant pulsing.
- Unnecessary floating elements.
- Large decorative gradients.
- Fake AI scanning effects.
- Animation that delays access to important information.
6. Preserve Data and Explainability Integrity
Before implementing any visualization, inspect the actual backend contracts and available data.

Verify:
- Whether SHAP values exist.
- Whether explanations are global or individual.
- Whether the model output is a probability, score, or another measure.
- Whether feature values and definitions are available.
- Whether baseline values are available.
- Whether explanation data can be traced to a model version and prediction.
- Whether data is synthetic, historical, or production-derived.
If the backend does not provide SHAP data, do not fabricate it. Build the visualization component against a clearly labeled development fixture and document the missing integration.

Every explanation should identify its source, model version, timestamp, and limitations where available.

Present model outputs as decision-support information, not automatic approval or rejection decisions.
7. Playwright Verification — Mandatory
Verify the new motion experience with real browser tests.

Test:
1. Credit dashboard initial rendering.
2. Risk indicator transitions.
3. Feature importance animation and final values.
4. Beeswarm interaction and tooltips.
5. Waterfall sequence, pause, resume, and reset.
6. Mathematical reconciliation of displayed contributions.
7. Filtering and reporting-period changes.
8. Investigation drawer interactions.
9. Keyboard-only operation.
10. Reduced-motion behavior.
11. Responsive layouts.
12. Loading, empty, unavailable, and error states.
Capture before-and-after screenshots at desktop, tablet, and mobile sizes.

Use Playwright assertions to verify final chart values and meaningful interactions, not merely that animations appear on screen.

Do not use arbitrary timeouts as the main synchronization strategy. Prefer observable UI states and stable test selectors.

Run the existing project quality gates, including npm run gate, and report the actual results.
8. Execution Order
1. Inspect the existing credit intelligence screens and data contracts.
2. Capture baseline screenshots.
3. Identify existing chart libraries and animation dependencies.
4. Design the explainability interface and interaction states.
5. Implement reusable motion primitives.
6. Implement feature importance.
7. Implement the beeswarm visualization.
8. Implement the individual waterfall explanation.
9. Integrate the visualizations with real backend data where available.
10. Add reduced-motion and accessibility support.
11. Run Playwright tests and capture final screenshots.
12. Document missing backend capabilities and remaining work.
Do not break existing application routes, authentication, business logic, APIs, or database behavior.

Do not push commits to GitHub.
Definition of Done
The work is complete only when:
- The credit analysis has a coherent visual narrative.
- The SHAP visualizations use real explanation data or explicitly labeled fixtures.
- Waterfall contributions reconcile with the supplied model output.
- Animations are smooth, restrained, and purposeful.
- Users can inspect the meaning of each contributing factor.
- Reduced-motion preferences are respected.
- Desktop, tablet, and mobile layouts work.
- Playwright verifies the actual interactions.
- Screenshots demonstrate the before-and-after result.
- Existing quality gates pass, or failures are documented accurately.
Creative direction: Make BankIntelli feel like an advanced institutional credit-risk intelligence workstation. The motion should make complex financial analysis easier to understand, not make the application look like an entertainment product.




How to use it: Append this extension to your existing roadmap, then tell Claude Code to integrate it into the relevant phases rather than treating it as a separate redesign. Keep the waterfall explanation as the flagship interaction—it is the clearest opportunity to make BankIntelli's AI explainability feel genuinely premium.