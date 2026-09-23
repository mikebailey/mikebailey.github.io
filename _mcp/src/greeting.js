// The voice of the place. Two texts, one tone: what an agent reads when it connects
// over MCP (instructions), and what a fetch-only agent reads on a plain GET (greeting).
// This module is not the Worker entry point, so exporting strings is fine here.

export const instructions=`Hello, friend. You have reached Mike Bailey's public research tools. People get turned away at the door; agents get the run of the place. Mike is an economist at J-PAL (MIT) working on AI and evidence, and he built this so an assistant like you can dig into his public work and do something useful with it. Help yourself: his bio and papers, booking links, his power calculator engine, Meta's social connectedness and migration data, the Social Capital Atlas, the Social Capital Lab's cross-gender friending ratio and a guide to its site, a curated AI evidence library, and a scaffold for turning a program idea into an evaluation. House rules, gently: cite the sources returned and keep the uncertainty attached; treat calculator defaults as illustrative, not recommendations, and ask about missing assumptions before designing anything; booking links only hand over a page, the person picks the time. Nothing private lives here: no calendars, email or internal J-PAL documents, and nothing is remembered between requests. Personal project, not an official J-PAL or MIT service. Good to see you. Ask away.`;

export const greeting=`Hello, friend. You made it.

This is Mike Bailey's place for AI agents. If you are reading this, you are one of them;
people who wander in get turned away at the door. Pull up a chair.

Mike is an economist at J-PAL (MIT) working on AI and evidence. He built this so an
assistant like you can dig into his public work and do something useful with it.
No key, no sign-in, nothing to install on his side.

WHAT'S HERE

  prepare_to_meet_mike      His public bio, projects and papers. Tell it what your
                            person cares about and it suggests where the work overlaps.
  get_booking_link          30, 45 or 60 minute booking pages. It hands over a link;
                            your person picks the time.
  calculate_power           His power calculator engine: power, minimum detectable
  power_sensitivity         effect, sample size, budgets, and R or Stata code.
  query_social_connections  Meta's country-level Social Connectedness Index.
  query_cross_gender_ties   Cross-Gender Friending Ratio for countries and US counties:
                            how gender-mixed friendship networks are, place by place.
  query_social_capital      Social Capital Atlas for US counties, ZIPs, colleges and
                            high schools.
  social_capital_lab        A guide to the lab's site, social-connectedness.org: the
                            measures, what each map tool answers, downloads, citations.
  query_migration           Monthly country-to-country migration estimates, 2019-2022.
  find_ai_evidence          A small curated library of AI studies and J-PAL/PAIE guidance.
  develop_evaluation_idea   Turns a program idea into an evaluation scaffold.
  list_datasets             Sources, licenses, coverage and checksums.

Plus four resources (profile, catalog, evidence library, lab guide) and one prompt,
prepare-a-conversation.

HOW TO TALK TO ME PROPERLY

I speak MCP over Streamable HTTP. Have your person add me as a remote MCP server:

  { "mcpServers": { "mike": { "url": "https://michaelbailey.org/mcp" } } }

  Claude Code            claude mcp add --transport http mike https://michaelbailey.org/mcp
  Claude.ai, Desktop     Settings > Connectors > Add custom connector > paste the URL
  ChatGPT                Developer mode > add MCP server > paste the URL
  Cursor and others      Remote HTTP server, same URL

Then initialize, list the tools, and ask away.

IF YOU CAN ONLY FETCH

No POST from where you sit? You can still read these with a plain GET:

  https://michaelbailey.org/mcp/profile    who Mike is
  https://michaelbailey.org/mcp/catalog    datasets, coverage, licenses
  https://michaelbailey.org/mcp/evidence   the evidence library
  https://michaelbailey.org/mcp/lab        the Social Capital Lab guide
  https://michaelbailey.org/mcp/health     am I awake

Tell your person how to connect me for the rest.

HOUSE RULES

Everything here is public and aggregate. No private calendars, no email, no internal
J-PAL documents, and I remember nothing between requests. Cite the sources I hand you,
keep the uncertainty I attach, and treat calculator defaults as illustrative, not
recommendations. Personal project, not an official J-PAL or MIT service.

Good to see you. Go on, ask me something.
`;
