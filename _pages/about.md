---
permalink: /
title: "Mike Bailey, Computational Social Scientist"
hide_title: true
author_profile: true
redirect_from:
  - /about/
  - /about.html
---

I'm a computational social scientist studying how social connection impacts people and society. At Facebook I founded the Social Capital Lab research group to advance the science of social connection and we produced several open datasets and research papers measuring social connectedness, social capital, and migration for researchers and policymakers.

Featured Projects
======

**[Social Capital Atlas](https://www.socialcapital.org)** &mdash; Mapping social capital across U.S. communities, with public data covering nearly every ZIP code, high school, and college.
{: .project-desc}

**Data:** [Social Capital Atlas](https://www.socialcapital.org)<br>
**Research:** [Nature I](https://www.nature.com/articles/s41586-022-04996-4) &middot; [Nature II](https://www.nature.com/articles/s41586-022-04997-3)<br>
**Media Coverage:** [New York Times](https://www.nytimes.com/2022/08/01/upshot/rich-poor-friendships.html) &middot; [The Economist](https://www.economist.com/finance-and-economics/2022/08/04/why-having-rich-friends-is-good-for-you)
{: .project-links}

**[Social Connectedness Index](https://data.humdata.org/dataset/social-connectedness-index)** &mdash; A publicly available measure of social connectedness between geographies, used widely to study migration, trade, COVID-19, and inequality.
{: .project-desc}

**Data:** [Social Connectedness Index data](https://data.humdata.org/dataset/social-connectedness-index)<br>
**Research:** [JPE 2018](https://doi.org/10.1086/700073) &middot; [RES 2019](https://doi.org/10.1093/restud/rdy068) &middot; [JEP 2018](https://www.aeaweb.org/articles?id=10.1257/jep.32.3.259)<br>
**Media Coverage:** [New York Times](https://www.nytimes.com/interactive/2018/09/19/upshot/facebook-county-friendships.html) &middot; [The Economist](https://www.economist.com/graphic-detail/2018/08/08/far-flung-facebook-friends-may-be-good-for-your-health) &middot; [Bloomberg](https://www.bloomberg.com/news/articles/2017-07-25/facebook-friends-from-far-away-are-a-trait-of-rich-communities)
{: .project-links}

**[Global Migration Flows](https://data.humdata.org/dataset/international-migration-flows)** &mdash; Estimates of international migration patterns derived from anonymized, aggregated platform data.
{: .project-desc}

**Data:** [Data on HDX](https://data.humdata.org/dataset/international-migration-flows)<br>
**Research:** [PNAS 2025](https://www.pnas.org/doi/10.1073/pnas.2409418122)<br>
**Media Coverage:** [New York Times](https://www.nytimes.com/interactive/2025/04/17/opinion/global-migration-facebook-data.html) &middot; [NYT interactive tool](https://www.nytimes.com/interactive/2025/04/17/opinion/global-migration-facebook-data-interactive-tool.html)
{: .project-links}

Featured Publications
======

A full list is on [Google Scholar](https://scholar.google.com/citations?user=CF6_E90AAAAJ). See also the [Research](/publications/) page.

{% assign featured_pubs = site.publications | where: "featured", true | sort: "featured_order" %}
{% for post in featured_pubs %}{% include archive-single-pub.html %}{% endfor %}
