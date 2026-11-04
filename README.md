# HA-110 Harmonic Joint Module

**English** | [简体中文](README.zh-CN.md)

A robot joint module that coaxially integrates a frameless motor, a harmonic reducer, a crossed roller bearing, and dual absolute encoders. The body has an outer diameter of Ø110 mm, the output mounting flange is Ø118 mm, and a Ø20 mm wiring bore runs through the center.

**Live demo: https://wys08hfut.github.io/harmonic_actuator/**

## Highlights

- **Space**: The motor, reducer, bearing, and encoders are stacked coaxially inside the Ø110 mm body, and the Ø20 mm central bore lets cables pass straight through—reducing external cabling and the joint envelope.
- **Transmission**: The frameless motor drives the wave generator directly. The flexspline has 100 teeth and the circular spline 102, a 2-tooth difference that gives a nominal 50:1 reduction ratio—low backlash, high stiffness, and a compact structure.
- **Control**: Absolute encoders on both the input and output sides report the joint position as soon as the module is powered on. The output-side crossed roller bearing carries bending moments directly, and the rigid housing limits deformation.
- **Explainer**: The interactive 3D page supports exploded view, cutaway, automatic drive, and continuous reduction-ratio adjustment, and includes a 2D section drawing with a live tooth magnifier.

## Interactive explainer

Open the [live page](https://wys08hfut.github.io/harmonic_actuator/) to try the following. The interface is currently in Chinese; the labels below give the original text with an English translation.

- Drag the **Explode** (拆解) slider at the bottom to step through the 24 parts in assembly order.
- Turn on **Cutaway** (剖切) to see how the motor, bearing, and harmonic teeth relate internally.
- Turn on **Drive** (传动, running by default) to watch the wave generator deflect the flexspline into an ellipse while the flexspline teeth engage the circular spline one by one. Both the input speed and a continuous 20–100 reduction ratio are adjustable.
- Click **Teeth** (齿部) for an axial close-up of the gear rim, or **Output** (输出端) for the output flange and crossed roller bearing.
- Click **Section drawing** (结构图) to open the 2D axial section with a live tooth magnifier in the top-right corner; zoom with the wheel or a pinch gesture, and drag to pan.
- Click any part for a Chinese explanation card; press `Esc` to close it and `R` to reset.

The page also works on phones: the bottom becomes a single-column control bar, a collapsible "why designed this way" panel is available, and the section drawing can be zoomed.

## Key specifications (demo baseline)

| Item | Value |
|---|---|
| Body outer diameter | Ø110 mm |
| Output mounting flange | Ø118 mm |
| Overall length | 122 mm |
| Central through bore | Ø20 mm |
| Harmonic tooth counts | Flexspline Zf=100 / circular spline Zc=102 |
| Nominal reduction ratio | 50:1 (20–100 shown in the demo) |
| Demo input speed | 0–3000 rpm |
| Output bearing | Crossed roller bearing RB7013 |
| Encoders | 14-bit input, 19-bit output, both absolute |
| Protection | IP40 by default, with the Ø20 mm bore left open |

> The page is a structural principle demo, and the drive animation runs at 1/20 speed. Dimensions, reduction ratios, speeds, and other values only illustrate how it works and are not a commitment to product performance. Final specifications are subject to the official datasheet.

## Axial section diagram

![HA-110 axial section](https://wys08hfut.github.io/harmonic_actuator/assets/harmonic_actuator_section_teaching.svg)

## About this repository

This repository is used for product presentation and for deploying the online explainer. The page is hosted on GitHub Pages and published automatically after each update; the technical implementation and design materials are kept in the local development environment.
