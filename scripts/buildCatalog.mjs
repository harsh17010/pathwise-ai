import fs from "node:fs";
import path from "node:path";

const source = process.argv[2] ?? "/home/ubuntu/upload/train.csv";
const output = process.argv[3] ?? path.resolve("server/data/catalog.json");
const csv = fs.readFileSync(source, "utf8");
const lines = csv.split(/\r?\n/).slice(1);

function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      fields.push(current);
      current = "";
    } else current += char;
  }
  fields.push(current);
  return fields;
}

const firstByCourse = new Map();
for (const line of lines) {
  if (!line) continue;
  const [, review, course] = parseCsvLine(line);
  if (review && course && !firstByCourse.has(course)) firstByCourse.set(course, review);
}

const skillMaps = [
  [/Python|Pandas|NumPy|Django|Flask|Data Science|OOP|Automation/i, ["Python", "Programming"]],
  [/SQL|PostgreSQL|Database|Data Warehouse|ETL/i, ["SQL", "Data Modeling"]],
  [/Excel|Power BI|Tableau|Visualization|Exploratory/i, ["Data Analysis", "Visualization"]],
  [/Machine Learning|Supervised|Unsupervised|Feature Engineering/i, ["Machine Learning", "Modeling"]],
  [/Deep Learning|Neural Networks|Computer Vision|Transfer Learning|Reinforcement/i, ["Deep Learning", "Modeling"]],
  [/React|JavaScript|TypeScript|HTML|CSS|Angular|Vue/i, ["Frontend Development", "JavaScript"]],
  [/Node|REST|GraphQL|Java|Go|Spring|API/i, ["Backend Development", "APIs"]],
  [/AWS|Azure|Google Cloud|Docker|Kubernetes|DevOps|CI CD|MLOps/i, ["Cloud", "Deployment"]],
  [/Kafka|Spark|Data Engineering/i, ["Data Engineering", "Distributed Systems"]],
  [/Cybersecurity|Hacking/i, ["Cybersecurity", "Security"]],
  [/Blockchain|Solidity/i, ["Blockchain", "Smart Contracts"]],
  [/Statistics|Probability|Calculus|Linear Algebra|Hypothesis/i, ["Mathematics", "Statistics"]],
  [/Android|iOS|Flutter|React Native/i, ["Mobile Development", "App Development"]],
  [/IoT|Embedded|Raspberry/i, ["Embedded Systems", "Hardware"]],
];

function infer(course) {
  const skills = [];
  for (const [pattern, matches] of skillMaps) if (pattern.test(course)) skills.push(...matches);
  const uniqueSkills = [...new Set(skills.length ? skills : ["Programming", "Problem Solving"])].slice(0, 4);
  const advanced = /Advanced|Optimization|Orchestration|Performance|Architecture|MLOps|Fine-tuning|Reinforcement/i.test(course);
  const beginner = /Beginners|Fundamentals|Basics|Essentials|Practitioner|Masterclass/i.test(course);
  const level = advanced ? "Advanced" : beginner ? "Beginner" : "Intermediate";
  const durationHours = advanced ? 24 : beginner ? 10 : 16;
  const format = /Project|Development|Pipeline|Design|Engineering|Programming/i.test(course) ? "Hands-on course" : "Guided course";
  return { skills: uniqueSkills, level, durationHours, format };
}

function prerequisitesFor(course, meta) {
  const needsPython = /Data Science|Pandas|Machine Learning|Deep Learning|Computer Vision|NLP|Feature Engineering|MLOps|Reinforcement|Transfer Learning/i.test(course);
  const needsMath = /Machine Learning|Deep Learning|Neural|Statistics|Bayesian|Hypothesis|Calculus|Linear Algebra/i.test(course);
  const needsSql = /Advanced SQL|Database Performance|Warehouse|ETL/i.test(course);
  const needsJs = /React|TypeScript|Node|Angular|Vue|GraphQL|React Native/i.test(course);
  const result = [];
  if (needsPython && course !== "Python for Absolute Beginners") result.push("Python for Absolute Beginners");
  if (needsMath && !/Calculus|Linear Algebra|Probability|Statistics/i.test(course)) result.push("Probability and Statistics");
  if (needsSql) result.push("SQL for Beginners");
  if (needsJs && !/JavaScript Fundamentals/.test(course)) result.push("JavaScript Fundamentals");
  if (meta.level === "Advanced" && /Python/.test(course)) result.push("Python Programming Masterclass");
  return [...new Set(result)].filter(item => item !== course);
}

const catalog = [...firstByCourse.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([title, review], index) => {
  const descriptor = review.split(". ")[1]?.replace(/\.$/, "") ?? "Technical course description unavailable";
  const meta = infer(title);
  return {
    id: `course-${String(index + 1).padStart(3, "0")}`,
    title,
    type: "course",
    provider: "Pathwise catalog",
    source: "uploaded-training-data",
    description: descriptor,
    ...meta,
    prerequisites: prerequisitesFor(title, meta),
    catalogFact: `The uploaded dataset describes ${title} through the technical topic: ${descriptor}`,
  };
});

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(catalog, null, 2));
console.log(`Wrote ${catalog.length} catalog items to ${output}`);
