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

**[Social Capital Atlas](https://socialcapital.org)** &mdash; with Raj Chetty and Opportunity Insights. Mapping social capital across U.S. communities, with public data covering nearly every ZIP code, high school, and college. [[Nature I](https://www.nature.com/articles/s41586-022-04996-4)] [[Nature II](https://www.nature.com/articles/s41586-022-04997-3)] [[NYT](https://www.nytimes.com/2022/08/01/upshot/rich-poor-friendships.html)]

**[Social Connectedness Index](https://data.humdata.org/dataset/social-connectedness-index)** &mdash; with Johannes Stroebel and collaborators at NYU. A publicly available measure of social connectedness between geographies, used widely to study migration, trade, COVID-19, and inequality. [[JPE 2018](https://www.journals.uchicago.edu/doi/10.1086/700073)] [[RES 2019](https://academic.oup.com/restud/article/86/6/2403/5306066)] [[JEP 2018](https://www.aeaweb.org/articles?id=10.1257/jep.32.3.259)]

**[Global Migration Flows](https://data.humdata.org/dataset/international-migration-flows)** &mdash; estimates of international migration patterns derived from anonymized, aggregated platform data. [[NYT interactive](https://www.nytimes.com/interactive/2025/04/17/opinion/global-migration-facebook-data-interactive-tool.html)] [[Dataset on HDX](https://data.humdata.org/dataset/international-migration-flows)]

Featured Publications
======

A full list is on [Google Scholar](https://scholar.google.com/citations?user=CF6_E90AAAAJ). See also the [Research](/publications/) page.

{% assign featured_pubs = site.publications | where: "featured", true | sort: "featured_order" %}
{% for post in featured_pubs %}{% include archive-single-pub.html %}{% endfor %}
