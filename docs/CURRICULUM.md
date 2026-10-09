# Curriculum roadmap

This document is the research behind Numerola's **campaigns**. Each campaign covers one level or field of math. It gives:

1. a difficulty ladder from grade 1 to university, checked against national curricula;
2. a prerequisite chain for the linear-algebra campaign (*Eigenvale*);
3. other equation-heavy fields that could become campaigns;
4. a suggested campaign list;
5. design notes on keeping difficulty consistent within a campaign.

All sources were fetched in October 2026 unless marked otherwise. Topic lists are summaries, not full standards. Check the linked documents before writing level content.

## Sources at a glance

| Code | Source | Link |
|---|---|---|
| **FI-POPS** | Opetushallitus, *Perusopetuksen opetussuunnitelman perusteet 2014* (Finnish national core curriculum for basic education), Matematiikka, grades 1–2, 3–6 and 7–9 | [PDF (oph.fi)](https://www.oph.fi/sites/default/files/documents/perusopetuksen_opetussuunnitelman_perusteet_2014.pdf) |
| **FI-LOPS** | Opetushallitus, *Lukion opetussuunnitelman perusteet 2019* (upper secondary, OPH-2263-2019, in force since 1.8.2021), §7.13 Matematiikka | [ePerusteet PDF export](https://eperusteet.opintopolku.fi/eperusteet-service/api/dokumentit/10264170), [OPH overview page](https://www.oph.fi/fi/koulutus-ja-tutkinnot/lukion-opetussuunnitelmien-perusteet) |
| **US-CCSS** | Common Core State Standards for Mathematics | [thecorestandards.org/Math](https://www.thecorestandards.org/Math/) |
| **UK-NC** | Department for Education, *National curriculum in England: mathematics programmes of study* | [gov.uk page](https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study): [KS1–2 PDF](https://assets.publishing.service.gov.uk/media/5a7da548ed915d2ac884cb07/PRIMARY_national_curriculum_-_Mathematics_220714.pdf), [KS3 PDF](https://assets.publishing.service.gov.uk/media/5a7c1408e5274a1f5cc75a68/SECONDARY_national_curriculum_-_Mathematics.pdf), [KS4 PDF](https://assets.publishing.service.gov.uk/media/5a7dc9dced915d2ac884d8ef/KS4_maths_PoS_FINAL_170714.pdf) |
| **MIT-OCW** | MIT OpenCourseWare university courses (listed per tier below) | [ocw.mit.edu](https://ocw.mit.edu/) |

**Sources that could not be fetched.** These are marked "not verified" wherever they appear:

- `ibo.org`: HTTP 403, so the official IB syllabus is not cited directly.
- `3blue1brown.com`: the page is rendered by JavaScript and the fetch tool was blocked, so the chapter titles come from a web search.
- The Brin & Page PageRank paper on `infolab.stanford.edu`: HTTP 403.
- SIAM's own page for the Bryan & Leise article: HTTP 403. The author-hosted PDF was used instead.

---

## 1. Difficulty ladder (grade 1 → university)

Grade numbers follow the Finnish/US convention: grade 1 is about age 7. **England's Year *n* is roughly one grade earlier than US grade *n*** because Reception comes before Year 1. Line up by age, not by number.

### Tier 1: Early primary (grades 1–2)

| Source | Core content |
|---|---|
| FI-POPS, grades 1–2 (content areas S1–S4, printed pp. 128–129) | **S1 Thinking skills**: compare, classify and order; first steps in programming as step-by-step instructions. **S2 Numbers and operations**: natural numbers; quantity, number word and numeral; decompositions of 1–10; base-ten with concrete models; + and − first within 0–20, then 0–100; commutativity and associativity; multiplication concept, **times tables 1–5 and 10**; groundwork for division; fractions as equal parts. **S3 Geometry and measurement**: 3D solids and 2D shapes; direction and position; length, mass, volume, time (m, cm, kg, g, l, dl); clock times. **S4 Data**: simple tables and bar charts. |
| US-CCSS [Grade 1](https://www.thecorestandards.org/Math/Content/1/introduction/), [Grade 2](https://www.thecorestandards.org/Math/Content/2/introduction/) | **G1** critical areas: + and − strategies within 20; place value (tens and ones); linear measurement; composing and decomposing shapes. **G2**: base-ten notation to 1000; fluent + and −; standard units; analysing shapes. |
| UK-NC Key Stage 1 (Years 1–2; KS1–2 PDF) | Focus: "confidence and mental fluency with whole numbers, counting and place value". By the end of Year 2, pupils know the number bonds to 20. Strands: place value; + −; × ÷; fractions; measurement (length, mass, capacity, time, money); properties of shapes; position and direction. Statistics is added in Year 2. |

**Game fit:** counting, number bonds, place value, + and − to 100, early times tables, shapes, telling time and money.

### Tier 2: Upper primary (grades 3–6)

| Source | Core content |
|---|---|
| FI-POPS, grades 3–6 (S1–S5, printed pp. 234–235) | **S1**: systematic search for alternatives; programming in a graphical environment. **S2**: base-ten and divisibility; written algorithms for + − × ÷; **times tables 6–9, then all of 1–10 secured**; rounding and estimation; **negative integers**; fractions and their operations; decimals; percentages, linking fraction, decimal and percent. **S3 Algebra**: number patterns, the idea of an unknown, solving equations by reasoning and trial. **S4 Geometry**: solids (prism, cylinder, cone, pyramid); polygons, triangles, quadrilaterals, circle; angles (draw, measure, classify); line symmetry; **coordinate plane (first quadrant, then all four)**; scale; perimeter, area, volume of a cuboid; unit conversion. **S5 Data and probability**: tables and charts; min, max, mean, mode; impossible, possible or certain. The section also says: *"Oppimispelit ja -leikit ovat yksi tärkeä ja oppilaita motivoiva työtapa"* (learning games are an important, motivating way of working). |
| US-CCSS [G3](https://www.thecorestandards.org/Math/Content/3/introduction/), [G4](https://www.thecorestandards.org/Math/Content/4/introduction/), [G5](https://www.thecorestandards.org/Math/Content/5/introduction/), [G6](https://www.thecorestandards.org/Math/Content/6/introduction/) | **G3**: × and ÷ within 100; unit fractions; area and arrays; 2D shapes. **G4**: multi-digit × and ÷; fraction equivalence, adding like denominators, fraction × whole number; classifying shapes by parallel and perpendicular sides, angles and symmetry. **G5**: fluent + and − of fractions; × and limited ÷ of fractions; decimals to hundredths; volume. **G6**: ratio and rate; ÷ of fractions; rational numbers including negatives; **expressions and equations**; statistical thinking. |
| UK-NC Lower KS2 (Y3–4) and Upper KS2 (Y5–6) | **Y3–4**: fluency with the four operations and number facts; simple fractions and decimal place value; shape properties; accurate measuring; statistics. **Y5–6**: larger integers; fractions, decimals and percentages; written long × and ÷. **Year 6 adds "Ratio and proportion" and "Algebra"**, which introduce "the language of algebra". |

**Game fit:** times tables, all four operations, fractions, decimals and percentages, negatives, area and perimeter, angles, coordinates, first unknowns (`□ + 7 = 12`, `3x + 4 = 25`).

### Tier 3: Lower secondary (grades 7–9)

| Source | Core content |
|---|---|
| FI-POPS, grades 7–9 (S1–S6, printed pp. 374–375) | **S1**: logic, counting the number of options, basics of **proof**, truth values of statements, algorithmic thinking and programming. **S2**: negatives, × and ÷ of fractions, opposite and reciprocal, absolute value, **real numbers**, prime factorisation, percentage change, **integer powers, square roots**. **S3 Algebra**: variables, power expressions, **polynomials** (+ − ×), linear equations, incomplete quadratics, **systems of two equations (graphical and algebraic)**, linear inequalities, sequences, proportion. **S4 Functions**: direct and inverse proportion, the function concept, lines and **parabolas**, **slope and intercept**, zeros. **S5 Geometry**: congruence and similarity, constructions, **Pythagoras and its converse, trigonometric functions**, inscribed and central angles, Thales' theorem, circle and sector, area and volume of sphere, cylinder and cone. **S6**: frequency, median, spread, probability. |
| US-CCSS [G7](https://www.thecorestandards.org/Math/Content/7/introduction/), [G8](https://www.thecorestandards.org/Math/Content/8/introduction/) | **G7**: proportional relationships; rational-number operations; expressions and linear equations; scale drawings; area, surface area and volume; inference from samples. **G8**: linear equations and **systems of linear equations**; the **function concept**; distance, angle, similarity, congruence; **Pythagorean theorem**. |
| UK-NC Key Stage 3 (Y7–9; KS3 PDF) | Strands: Number; **Algebra**; Ratio, proportion and rates of change; Geometry and measures; Probability; Statistics. Algebra covers notation, rearranging formulae, solving linear equations, **graphs of linear and quadratic functions**, `y = mx + c`, gradients and intercepts, approximate solutions of simultaneous equations from graphs, and arithmetic and geometric sequences (nth term). |

**Game fit:** this is the core "algebra" band: equations, systems, graphs of lines, Pythagoras, basic trigonometry. **Systems of two linear equations are the first direct foundation for Eigenvale.**

### Tier 4: Upper secondary (grades 10–12)

| Source | Core content |
|---|---|
| FI-LOPS §7.13 (long math **MAA**, short math **MAB**, common module **MAY1**) | **MAY1** *Luvut ja yhtälöt* (Numbers and equations, 2 op), taken by everyone. **MAA (long)**: MAA2 *Funktiot ja yhtälöt 1* (polynomials, the quadratic formula, rational and root functions, 3 op); MAA3 *Geometria* (2 op); **MAA4 *Analyyttinen geometria ja vektorit*** (equations of line, circle and parabola; systems of equations; distance from point to line; **plane vectors, addition, scalar multiple, dot product, angle between vectors**, 3 op); MAA5 *Funktiot ja yhtälöt 2* (radians, unit circle, sin and cos, exponentials, logarithms); **MAA6 *Derivaatta*** (limit, continuity, derivative rules, chain rule, extrema, 3 op); **MAA7 *Integraalilaskenta*** (antiderivative, definite integral, rectangle rule, area and volume); MAA8 *Tilastot ja todennäköisyys* (mean and standard deviation, **correlation and linear regression**, permutations and combinations, **binomial distribution**, expected value); MAA9 *Talousmatematiikka* (financial math, 1 op). National optional modules: **MAA10 *3D-geometria*** (3D vectors, **dot and cross product**, lines and planes in space, functions of two variables); **MAA11 *Algoritmit ja lukuteoria*** (sequence, selection and repetition; flowcharts; sorting algorithms; **logical connectives and truth values**; divisibility, **congruence**, **Euclid's algorithm**); MAA12 *Analyysi ja jatkuva jakauma* (inverse functions, limits at infinity, improper integrals, **normal distribution**). **MAB (short)**: MAB2 *Lausekkeet ja yhtälöt*, MAB3 *Geometria*, MAB4 *Matemaattisia malleja*, MAB5 *Tilastot ja todennäköisyys*, MAB6–7 financial math, MAB8 *Matemaattinen analyysi*, MAB9 *Tilastolliset ja todennäköisyysjakaumat*. |
| US-CCSS high school conceptual categories | [Number & Quantity](https://www.thecorestandards.org/Math/Content/HSN/introduction/), [Algebra](https://www.thecorestandards.org/Math/Content/HSA/), [Functions](https://www.thecorestandards.org/Math/Content/HSF/), [Modeling](https://www.thecorestandards.org/Math/Content/HSM/), [Geometry](https://www.thecorestandards.org/Math/Content/HSG/), [Statistics & Probability](https://www.thecorestandards.org/Math/Content/HSS/). Standards marked **(+)** are "additional mathematics" for advanced students. They include [Vector & Matrix Quantities (N-VM)](https://www.thecorestandards.org/Math/Content/HSN/VM/): add and subtract vectors; matrices to represent data and network incidence; add, subtract and multiply matrices; matrix multiplication is **not commutative** but is associative and distributive. |
| UK-NC Key Stage 4 (Y10–11, GCSE; KS4 PDF) | The same six strands as KS3. Algebra adds factorising quadratics, the quadratic formula, completing the square, **functions, inverse and composite functions**, graphs of exponential and trigonometric functions, **gradients and areas under graphs**, the equation of a circle, iteration, and quadratic inequalities. Geometry adds Pythagoras and trigonometric ratios, the sine and cosine rules, and **2D vectors (addition, scalar multiples, column vectors)**. Probability covers tree diagrams and Venn diagrams. Braces `{}` in the PDF mark the content for higher-attaining pupils. |
| IB DP (optional, **not verified**: ibo.org returned 403) | Two courses, *Analysis & Approaches* and *Applications & Interpretation*, each at SL or HL. According to a [secondary summary](https://www.savemyexams.com/learning-hub/subject-guides/ib-maths-topics/), both share five topic areas: Number & Algebra; Functions; Geometry & Trigonometry; Statistics & Probability; Calculus. |

**Game fit:** functions, trigonometry, exponentials and logarithms, first calculus, statistics. **MAA4 and MAA10 (vectors, dot and cross product) and CCSS N-VM (+) are the bridge into Eigenvale.**

### Tier 5: University years 1–2

| Course | Content (from the course page) |
|---|---|
| [MIT 18.01SC Single Variable Calculus](https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/) | Differentiation and integration of functions of one variable; a brief discussion of infinite series. |
| [MIT 18.02SC Multivariable Calculus](https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/) | Differential, integral and vector calculus for functions of several variables. |
| [MIT 18.06SC Linear Algebra (Strang)](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/) ([18.06 Spring 2010 lectures](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/)) | Unit I: *Ax = b and the Four Subspaces*. Unit II: *Least Squares, Determinants and Eigenvalues*. Unit III: *Positive Definite Matrices and Applications*. Textbook: Strang, [*Introduction to Linear Algebra*](https://math.mit.edu/~gs/linearalgebra/). |
| [MIT 6.042J Mathematics for Computer Science](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2010/) | Formal logic notation, proof methods, induction, sets and relations, elementary graph theory, integer congruences, asymptotic notation, counting, discrete probability. |
| [MIT 18.05 Intro to Probability and Statistics](https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/) | Combinatorics, random variables, distributions, **Bayesian inference**, hypothesis testing, confidence intervals, linear regression. |
| [MIT 18.03SC Differential Equations](https://ocw.mit.edu/courses/18-03sc-differential-equations-fall-2011/) | The usual year-2 follow-on to 18.01 and 18.06. |

### Tier 6: Advanced (upper undergraduate and beyond)

Examples: [MIT 8.04 Quantum Physics I](https://ocw.mit.edu/courses/8-04-quantum-physics-i-spring-2016/) (wave mechanics, Schrödinger equation in 1D and 3D); the second half of 18.06 (SVD, positive definite matrices, Jordan form, FFT); [MIT 6.041SC Probabilistic Systems Analysis](https://ocw.mit.edu/courses/6-041sc-probabilistic-systems-analysis-and-applied-probability-fall-2013/); [MIT 6.006 Introduction to Algorithms](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/).

---

## 2. Eigenvale: linear-algebra prerequisite chain

**Entry requirement:** Tier 3 algebra (solving linear equations and 2×2 systems, coordinates in all four quadrants, Pythagoras; FI-POPS S3–S5, CCSS G8) and ideally Tier 4 vectors (FI-LOPS MAA4, UK-NC KS4 vectors, CCSS N-VM).

| # | Concept | Teach geometrically? | Key equation or idea | Grounding |
|---|---|---|---|---|
| 1 | **Vectors**: arrows and lists; addition; scalar multiples | **Yes**: tip-to-tail arrows on a grid | `v + w`, `c·v` | 3b1b ch. 1; Immersive LA ch. 2; MAA4 |
| 2 | **Linear combinations, span, basis** | **Yes**: "which points can I reach with these two arrows?" | `c·v + d·w` | 3b1b ch. 2; 18.06 lecture 1 *The Geometry of Linear Equations* |
| 3 | **Dot product, length, angle** | **Yes**: projection or shadow; perpendicular means `v·w = 0` | `v·w = ‖v‖‖w‖cos θ`, `‖v‖ = √(v·v)` | Immersive LA ch. 3; MAA4 ("pistetulo, vektoreiden välinen kulma"); 3b1b ch. 9 |
| 4 | **Matrices as linear transformations** | **Yes, essential**: the columns are where `î` and `ĵ` land; the grid stays straight | the columns of `A` are the images of the basis vectors | 3b1b ch. 3; Immersive LA ch. 9 |
| 5 | **Matrix–vector multiplication** | Both: a combination of the columns | `Ax = x₁a₁ + x₂a₂` | 3b1b ch. 3; 18.06 lecture 1 |
| 6 | **Matrix–matrix multiplication** | **Yes**: composition, "apply B, then A"; order matters | `(AB)x = A(Bx)`, `AB ≠ BA` | 3b1b ch. 4; CCSS N-VM (+) non-commutativity |
| 7 | **Systems and Gaussian elimination** | Mostly algebraic, with the row picture (intersecting lines) and column picture (combining columns) | `Ax = b`, row operations, pivots, `A = LU` | 18.06SC Unit I (*Elimination with Matrices*, *Factorization into A = LU*); Immersive LA ch. 5 |
| 8 | **Determinant** | **Yes**: area or volume scale factor; sign means orientation flip; `det = 0` means the space is squashed | `det(AB) = det A · det B` | 3b1b ch. 6; 18.06SC *Properties of Determinants*, *Cramer's Rule, Inverse Matrix and Volume*; Immersive LA ch. 7 |
| 9 | **Inverse, rank, column space and null space** | **Yes**: "undo the transformation"; impossible when the space is squashed | `A⁻¹A = I`; invertible ⇔ `det A ≠ 0` | 3b1b ch. 7; 18.06SC *Multiplication and Inverse Matrices*; Immersive LA ch. 8 |
| 10 | **Eigenvalues and eigenvectors** | **Yes**: vectors that stay on their own line and only stretch | `Av = λv`, `det(A − λI) = 0` | 3b1b eigenvectors chapter; 18.06SC *Eigenvalues and Eigenvectors*; Immersive LA ch. 10 |
| 11 | **Diagonalization and powers** | Partly: change of basis to the eigenbasis | `A = SΛS⁻¹`, `Aᵏ = SΛᵏS⁻¹` | 18.06SC *Diagonalization and Powers of A*; 3b1b change-of-basis chapter |
| 12a | **Application: Markov chains** | Animated population flow between states | steady state `Ax = x` (eigenvalue 1) | 18.06SC *Markov Matrices; Fourier Series* |
| 12b | **Application: PageRank** | Graph of web pages and links | rank = eigenvector of the link matrix | Bryan & Leise, ["The $25,000,000,000 Eigenvector: The Linear Algebra Behind Google"](https://www.rose-hulman.edu/~bryan/googleFinalVersionFixed.pdf), *SIAM Review* 2006 |
| 12c | **Application: least squares, PCA, SVD** | Point clouds and their main axes | projection `AᵀAx̂ = Aᵀb`; PCA via eigenvectors of the covariance matrix | 18.06SC *Projection Matrices and Least Squares*, *Singular Value Decomposition*; Shlens, ["A Tutorial on Principal Component Analysis"](https://arxiv.org/abs/1404.1100) (arXiv:1404.1100) |

**Two orderings exist.** Strang's 18.06 is algebra-first: elimination and the four subspaces come in Unit I, and *Linear Transformations and Their Matrices* only in Unit III. 3Blue1Brown is geometry-first: transformations come in ch. 3, before determinants and inverses. For a visual game, **follow the geometry-first order** (steps 1–6 as transformations, then elimination as the tool that computes them). Keep Strang's column picture (`Ax` as a combination of the columns) as the link between the two.

### Free resources

- **3Blue1Brown, *Essence of linear algebra***: [series page](https://www.3blue1brown.com/topics/linear-algebra) (**not verified**: the page could not be rendered). Per [search results](https://notesbylex.com/essence-of-linear-algebra), the chapters run: 1 Vectors; 2 Linear combinations, span and basis vectors; 3 Linear transformations and matrices; 4 Matrix multiplication as composition; 5 3D transformations; 6 The determinant; 7 Inverse matrices, column space and null space; 8 Nonsquare matrices; 9 Dot products and duality. Later chapters cover cross products, change of basis, eigenvectors and eigenvalues, and abstract vector spaces.
- **Gilbert Strang, MIT 18.06 / 18.06SC**: [18.06SC](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/) (designed for independent study), [18.06 2010 lectures](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/), [textbook site](https://math.mit.edu/~gs/linearalgebra/).
- **Immersive Linear Algebra** (J. Ström, K. Åström, T. Akenine-Möller): [immersivemath.com/ila](https://immersivemath.com/ila/index.html). Interactive figures throughout. Chapters: Vectors, Dot Product, Vector Product, Gaussian Elimination, Matrix, Determinants, Rank, Linear Mappings, Eigenvalues and Eigenvectors.
- **Khan Academy, Linear Algebra**: [khanacademy.org/math/linear-algebra](https://www.khanacademy.org/math/linear-algebra).

---

## 3. Other equation-heavy fields

### 3.1 Calculus: *Fluxreach* (rivers of change)

- **Theme:** rates of flow, rising water, accumulating treasure.
- **Topics in order:** functions and graphs → limits and continuity → derivative as slope and rate → derivative rules (product, quotient, chain) → optimisation and curve sketching → antiderivatives → definite integral as area (rectangle sums first) → fundamental theorem → series (brief) → multivariable: partial derivatives, gradients, double integrals, vector fields.
- **Prerequisites:** Tier 4 functions (*Spirewood*). This matches FI-LOPS MAA6 *Derivaatta* and MAA7 *Integraalilaskenta*; UK-NC KS4 already asks for "gradients of graphs and areas under graphs".
- **Sources:** [MIT 18.01SC](https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/), [MIT 18.02SC](https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/), [OpenStax *Calculus Vol. 1*](https://openstax.org/details/books/calculus-volume-1).

### 3.2 Probability and statistics: *Chancewood*

- **Theme:** a forest of forking paths, dice-cursed spirits, oracle bargains.
- **Topics in order:** data displays, mean, median and mode → spread and standard deviation → classical vs. empirical probability → counting (permutations and combinations) → tree and Venn diagrams, conditional probability → discrete distributions, expected value, binomial → normal distribution → correlation and linear regression → sampling, confidence intervals, hypothesis tests → Bayes' rule and Bayesian inference.
- **Prerequisites:** Tier 2 fractions and percentages for the early acts; Tier 4 functions for the later acts. Curriculum anchors: FI-POPS 3–6 S5 and 7–9 S6; FI-LOPS MAA8 and MAA12; UK-NC KS4 Probability.
- **Built (prototype):** the first act only — mean, median, range; classical probability as a fraction; the complement; two independent events; two-dice sums; expected value of a simple game (FI-POPS 3–6 S5 / 7–9 S6 level). The later topics above are left for future acts.
- **Sources:** [MIT 18.05](https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/), [OpenStax *Introductory Statistics 2e*](https://openstax.org/details/books/introductory-statistics-2e), [Seeing Theory (Brown University)](https://seeing-theory.brown.edu/), a visual introduction.

### 3.3 Computer science and discrete math: *Bitforge*

- **Theme:** a dwarven rune-forge where spells are programs and locks are ciphers.
- **Topics in order:**
  1. Binary and other number bases; bits and bytes; hexadecimal.
  2. Logic: truth values, AND, OR, NOT, implication, truth tables (FI-POPS 7–9 S1; FI-LOPS MAA11 "konnektiivit ja totuusarvot").
  3. Algorithms: sequence, selection, repetition; flowcharts; sorting (FI-LOPS MAA11).
  4. Sets, relations, functions; proof and induction.
  5. Counting and discrete probability.
  6. Graph theory: paths, trees, shortest path, colouring.
  7. Growth of functions and Big-O.
  8. Number theory: divisibility, modular arithmetic, Euclid's algorithm (FI-LOPS MAA11).
  9. Cryptography basics: Caesar and Vigenère ciphers → modular exponentiation → RSA idea.
- **Prerequisites:** binary, logic and early algorithms need only Tier 2 (*Numerola*); proof, Big-O and RSA need Tier 3–4 algebra (*Algebrinth*).
- **Sources:** [MIT 6.042J](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2010/), [MIT 6.006](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/), [Khan Academy Cryptography](https://www.khanacademy.org/computing/computer-science/cryptography), [CS Unplugged: binary numbers](https://csunplugged.org/en/topics/binary-numbers/) (unplugged activities for younger players).

### 3.4 Physics: four campaigns of rising difficulty

Course descriptions are from MIT OCW. The equations are the standard textbook forms.

| Campaign | Core topics in order | Key equations | Math prerequisite | Source |
|---|---|---|---|---|
| **Forcehold** (mechanics) | kinematics → Newton's laws → work and energy → momentum → rotation and torque → gravitation and orbits | `v = v₀ + at`, `F = ma`, `E_k = ½mv²`, `p = mv`, `τ = r × F`, `F = Gm₁m₂/r²` | Algebra (*Algebrinth*); vectors and trigonometry (*Spirewood*); calculus optional (*Fluxreach*) | [MIT 8.01SC](https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/), [OpenStax *University Physics Vol. 1*](https://openstax.org/details/books/university-physics-volume-1) |
| **Wavecrest** (vibrations and waves) | simple harmonic motion → damped and driven oscillators → coupled oscillators (normal modes) → wave equation → superposition, standing waves → sound and light | `x(t) = A cos(ωt + φ)`, `v = fλ`, `∂²y/∂t² = v² ∂²y/∂x²` | Trigonometry, calculus, ODEs; normal modes are **eigenvectors** (*Eigenvale*) | [MIT 8.03SC](https://ocw.mit.edu/courses/8-03sc-physics-iii-vibrations-and-waves-fall-2016/) |
| **Stormspire** (electromagnetism) | charge and Coulomb's law → electric field and potential → circuits (Ohm, Kirchhoff) → magnetic field and Lorentz force → induction → Maxwell's equations, EM waves | `F = kq₁q₂/r²`, `V = IR`, `F = q(E + v × B)`, `ε = −dΦ/dt` | Vectors, cross product (*Spirewood*, MAA10); multivariable calculus (*Fluxreach*) | [MIT 8.02](https://ocw.mit.edu/courses/8-02-physics-ii-electricity-and-magnetism-spring-2007/) |
| **Quantumere** (quantum) | photons and the photoelectric effect → de Broglie waves → wavefunction and probability → Schrödinger equation in 1D (particle in a box) → operators, eigenvalues as measurements → spin, superposition | `E = hf`, `λ = h/p`, `Ĥψ = Eψ`, `∫|ψ|² dx = 1` | **Eigenvale** (eigenvalues, complex vectors), *Fluxreach*, *Chancewood* | [MIT 8.04](https://ocw.mit.edu/courses/8-04-quantum-physics-i-spring-2016/) |

---

## 4. Suggested campaign list

| Campaign | Tier | Fields | Prerequisite campaign |
|---|---|---|---|
| **Numerola**: Act I *The Counting Meadows* | 1 (grades 1–2) | counting, place value, + and − to 100, times tables 1–5 and 10, shapes, time and money | none |
| **Numerola**: Act II *The Fraction Isles* | 2 (grades 3–6) | four operations, times tables to 10, fractions, decimals and percentages, negatives, area, angles, coordinates, first unknowns | Numerola Act I |
| **Algebrinth** | 3 (grades 7–9) | variables, linear equations and systems, functions and lines, Pythagoras, basic trigonometry, probability | Numerola |
| **Spirewood** | 4 (grades 10–12) | polynomials, quadratics, trigonometric, exponential and logarithmic functions, analytic geometry, **2D and 3D vectors** | Algebrinth |
| **Chancewood** | 3–5 | statistics, probability, distributions, Bayes | Numerola Act II (early acts); Spirewood (later acts) |
| **Bitforge** | 2–5 | binary, logic, algorithms, graphs, Big-O, modular arithmetic, cryptography | Numerola Act II (early); Algebrinth (later) |
| **Fluxreach** | 4–5 | limits, derivatives, integrals, multivariable calculus | Spirewood |
| **Eigenvale** | 5 (university 1–2) | linear algebra: vectors → transformations → elimination → determinant → inverse → eigen → applications | Algebrinth (required), Spirewood vectors (recommended) |
| **Forcehold** | 4–5 | classical mechanics | Spirewood |
| **Wavecrest** | 5 | oscillations, waves | Fluxreach, Eigenvale |
| **Stormspire** | 5 | electromagnetism | Fluxreach, Spirewood |
| **Quantumere** | 6 (advanced) | quantum mechanics | Eigenvale, Fluxreach, Chancewood |

Only *Numerola* and *Eigenvale* are fixed names. The others are placeholders.

---

## 5. Design notes: keeping difficulty within one campaign

**Principle: one campaign stays in one tier. Adapt inside that tier and don't mix tiers.** A grade-2 player should never hit a quadratic. Eigenvale should never pad levels with times tables. Inside a tier, difficulty rises through problem parameters (number size, number of steps, fewer scaffolds). Content that belongs to another tier comes in as a campaign prerequisite, never as a mid-campaign surprise. The national curricula are built the same way: FI-POPS spells out each topic's extension tier by tier (e.g. + and − first within 0–20, then 0–100; the coordinate plane first in one quadrant, then in all four).

| Idea | What the research says | How to apply it in-game |
|---|---|---|
| **Cognitive Load Theory, worked-example effect** | For novices, studying worked examples beats unguided problem solving (Sweller 1988, [doi:10.1207/s15516709cog1202_4](https://doi.org/10.1207/s15516709cog1202_4); van Gog, Paas & Sweller 2010, [doi:10.1007/s10648-010-9145-4](https://doi.org/10.1007/s10648-010-9145-4)). | The first encounter with a new spell is a worked example, then a faded one (some steps blank), then a free problem. This extends the existing "wrong answers show the worked steps" rule in `DESIGN.md`. |
| **Expertise-reversal effect** | Guidance that helps novices can hinder more knowledgeable learners (Kalyuga 2007, [doi:10.1007/s10648-007-9054-3](https://doi.org/10.1007/s10648-007-9054-3)). | Track per-skill mastery and remove hints and scaffolds as it rises. Let returning players skip the tutorial trials. |
| **Spaced practice** | A meta-analysis of 317 experiments found distributed practice beats massed practice, and the best gap between sessions grows with the retention interval (Cepeda et al. 2006, *Psychological Bulletin*, [doi:10.1037/0033-2909.132.3.354](https://doi.org/10.1037/0033-2909.132.3.354)). | The existing *Attunement* decay already does this. Lengthen the decay interval for skills the player has mastered. |
| **Retrieval practice (testing effect)** | Taking a test improves long-term retention more than re-studying (Roediger & Karpicke 2006, [doi:10.1111/j.1467-9280.2006.01693.x](https://doi.org/10.1111/j.1467-9280.2006.01693.x)). | Overcharge questions are retrieval practice. Keep them low-stakes: a wrong answer gives a normal cast. |
| **Interleaving** | Mixing problem types in practice improved later math test scores compared with blocked practice (Rohrer & Taylor 2007, *Instructional Science*, [doi:10.1007/s11251-007-9015-8](https://doi.org/10.1007/s11251-007-9015-8)). | In later battles of a tier, mix that tier's skills so the player must choose the method. Interleave skills from the same tier only. |

**A practical adaptive rule.** Each skill has 3–5 internal levels inside its tier (e.g. Tier 2 multiplication: ×2/×5/×10 → ×3/×4 → ×6–×9 → two-digit × one-digit). Move up after a run of correct answers and down after repeated misses. Never move past the tier's ceiling. When a player hits that ceiling, offer the next campaign instead of harder content.
