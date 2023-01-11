---
title: "Active Seat Mount System for Helicopters"

---

Have you ever been in a helicopter before? Well I haven't. But I've been told that it shakes, A LOT.
Now imagine having to sit inside one for many hours. The severity and length of these vibrations is a 
serious occupantional hazard for helicopter flight crews which may lead to conditions such as headaches,
back pain, neck strain, and et cetera.
{: .text-justify}

The goal of this project was to reduced the amount of vibration experienced through the use of an actively controlled
seat mount system. The seat mount uses feedback control to actively push against the vibrations of the helicopter such that 
the vibration at the seat itself is reduced.
{: .text-justify}

The following video shows a test of the system with a static test mass on a large shaker system. The shaker
has been set to produce a vibration with a frequency spectrum roughly matching that measured from a Bell 412 helicopter.
{: .text-justify}

{% include video id="GcgSDmD3PFY" provider="youtube" %}

The controller of the system is based on the [Least Mean Squares Adaptive Filter](https://en.wikipedia.org/wiki/Least_mean_squares_filter).
As such, we see the system adapting/learning over time to attenuate the shaker vibration.
{: .text-justify}

The system was extended to operate with a seated manikin that more accurately modeled the dynamics of a person. The video below
demonstrates the capability of the extended system at attenutating the vibrations experienced by a human-like manikin.
{: .text-justify}

{% include video id="xve79fmmR1Q" provider="youtube" %}

The system's capabilities are well appreciated from the more relatable human-like point-of-view of the manikin.
 The detailed results of this work were later published and can be found [here](https://doi.org/10.1177/1045389X19844027).
 {: .text-justify}