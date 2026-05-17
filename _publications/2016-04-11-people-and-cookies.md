---
title: "People and Cookies: Imperfect Treatment Assignment in Online Experiments"
collection: publications
category: published
permalink: /publication/2016-people-and-cookies
date: 2016-04-11
authors: "Dominic Coey"
venue: "Proceedings of the 25th International Conference on World Wide Web (WWW '16), 1103–1111, 2016"
paperurl: "https://doi.org/10.1145/2872427.2882984"
description: "Cookie-based randomization underestimates person-level treatment effects and requires substantially larger samples for the same statistical power."
---

Identifying the same internet user across devices or over time is often infeasible. This presents a problem for online experiments, as it precludes person-level randomization. Randomization must instead be done using imperfect proxies for people, like cookies, email addresses or device identifiers. Cookies present a unique problem for randomized experiments because a user may be associated with multiple cookies, some of which might be assigned to the test group and some to the control group during an experiment, making inference at the person level difficult. We find the cookie treatment effect estimator converges to a weighted average of the marginal effects of treating more of a user's cookies. If the marginal effects of cookie treatment exposure are positive and constant, it underestimates the person level treatment effect by a factor equal to the number of cookies per user. Using cookie assignment data from Atlas and advertising exposure and purchase data from Facebook, we compare simulated cookie and person level advertising effectiveness experiments. The effect on statistical power is substantial: we find that sample sizes in a cookie test need to be two to three times larger to achieve the same power as an experiment with perfect treatment assignment.
