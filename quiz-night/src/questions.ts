// The question bank. The room server doesn't exist yet (see Arcade/CLAUDE.md), so nothing here is
// sent to a client as-is: `correct` stays server-side and reaches players only in AnswerReveal.
// Preview mode builds its sample screens from this bank so they show real questions.

export interface BankQuestion {
  category: string
  text: string
  /** Exactly CHOICES_PER_QUESTION long; `correct` indexes into it. */
  choices: string[]
  correct: number
}

export const QUESTION_BANK: readonly BankQuestion[] = [
  { category: 'Space', text: 'Which planet has the shortest day?', choices: ['Mercury', 'Jupiter', 'Earth', 'Neptune'], correct: 1 },
  { category: 'Space', text: 'Which planet is known as the red planet?', choices: ['Venus', 'Mars', 'Mercury', 'Saturn'], correct: 1 },
  { category: 'Space', text: 'Who was the first person to walk on the Moon?', choices: ['Buzz Aldrin', 'Yuri Gagarin', 'Neil Armstrong', 'Michael Collins'], correct: 2 },
  { category: 'Space', text: 'What is the closest star to Earth?', choices: ['Proxima Centauri', 'Sirius', 'The Sun', 'Alpha Centauri A'], correct: 2 },
  { category: 'Space', text: 'How many planets are in the Solar System?', choices: ['Seven', 'Eight', 'Nine', 'Ten'], correct: 1 },
  { category: 'Space', text: 'Which planet is the hottest in the Solar System?', choices: ['Mercury', 'Venus', 'Mars', 'Jupiter'], correct: 1 },
  { category: 'Space', text: 'Which planet has the Great Red Spot?', choices: ['Mars', 'Jupiter', 'Saturn', 'Venus'], correct: 1 },
  { category: 'Space', text: 'What is the name of the galaxy we live in?', choices: ['Andromeda', 'The Milky Way', 'Triangulum', 'Whirlpool'], correct: 1 },
  { category: 'Space', text: 'What force keeps the planets in orbit around the Sun?', choices: ['Magnetism', 'Gravity', 'Friction', 'Inertia'], correct: 1 },
  { category: 'Geography', text: 'What is the capital of Australia?', choices: ['Sydney', 'Canberra', 'Melbourne', 'Perth'], correct: 1 },
  { category: 'Geography', text: 'What is the capital of Canada?', choices: ['Toronto', 'Vancouver', 'Montreal', 'Ottawa'], correct: 3 },
  { category: 'Geography', text: 'In which country is Mount Kilimanjaro?', choices: ['Kenya', 'Tanzania', 'Uganda', 'Ethiopia'], correct: 1 },
  { category: 'Geography', text: 'Which is the largest hot desert in the world?', choices: ['Gobi', 'Kalahari', 'Sahara', 'Arabian'], correct: 2 },
  { category: 'Geography', text: 'Which river runs through Egypt?', choices: ['Niger', 'Congo', 'Nile', 'Zambezi'], correct: 2 },
  { category: 'Geography', text: 'Which strait separates Spain from Morocco?', choices: ['Bosphorus', 'Strait of Gibraltar', 'Strait of Hormuz', 'Bering Strait'], correct: 1 },
  { category: 'Geography', text: 'Which ocean is the largest?', choices: ['Atlantic', 'Pacific', 'Indian', 'Arctic'], correct: 1 },
  { category: 'Geography', text: 'Which mountain is the highest above sea level?', choices: ['K2', 'Mount Everest', 'Kangchenjunga', 'Lhotse'], correct: 1 },
  { category: 'Geography', text: 'What is the smallest country in the world by area?', choices: ['Monaco', 'Vatican City', 'San Marino', 'Nauru'], correct: 1 },
  { category: 'Geography', text: 'Which is the longest river in South America?', choices: ['Orinoco', 'Amazon', 'Parana', 'Magdalena'], correct: 1 },
  { category: 'Geography', text: 'What is the capital of Japan?', choices: ['Osaka', 'Tokyo', 'Kyoto', 'Nagoya'], correct: 1 },
  { category: 'Science', text: 'What is the chemical symbol for gold?', choices: ['Ag', 'Au', 'Gd', 'Go'], correct: 1 },
  { category: 'Science', text: 'Which element has atomic number 1?', choices: ['Helium', 'Oxygen', 'Hydrogen', 'Carbon'], correct: 2 },
  { category: 'Science', text: 'How many bones are there in an adult human body?', choices: ['186', '206', '226', '246'], correct: 1 },
  { category: 'Science', text: 'Which gas do plants take in from the air?', choices: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Methane'], correct: 2 },
  { category: 'Science', text: 'What is the hardest naturally occurring substance?', choices: ['Quartz', 'Steel', 'Diamond', 'Granite'], correct: 2 },
  { category: 'Science', text: 'What is the largest organ of the human body?', choices: ['The liver', 'The skin', 'The lungs', 'The brain'], correct: 1 },
  { category: 'Science', text: 'What is the chemical symbol for sodium?', choices: ['So', 'Sd', 'Na', 'Sn'], correct: 2 },
  { category: 'Science', text: 'How many chambers does the human heart have?', choices: ['Two', 'Three', 'Four', 'Five'], correct: 2 },
  { category: 'Science', text: 'What does DNA stand for?', choices: ['Deoxyribonucleic acid', 'Dinucleic acid', 'Deoxyribose nuclear acid', 'Double nucleic acid'], correct: 0 },
  { category: 'Science', text: 'At what temperature does water freeze at sea level?', choices: ['0 °C', '4 °C', '32 °C', '-32 °C'], correct: 0 },
  { category: 'Science', text: 'Roughly how fast does light travel in a vacuum?', choices: ['300,000 km per second', '300,000 km per hour', '30,000 km per second', '3,000,000 km per second'], correct: 0 },
  { category: 'Nature', text: 'Which is the fastest land animal?', choices: ['Cheetah', 'Pronghorn', 'Lion', 'Greyhound'], correct: 0 },
  { category: 'Nature', text: 'How many legs does a spider have?', choices: ['Six', 'Eight', 'Ten', 'Twelve'], correct: 1 },
  { category: 'Nature', text: 'Which is the largest animal alive today?', choices: ['African elephant', 'Blue whale', 'Giraffe', 'Whale shark'], correct: 1 },
  { category: 'Nature', text: 'What do bees collect to make honey?', choices: ['Sap', 'Nectar', 'Resin', 'Dew'], correct: 1 },
  { category: 'Nature', text: 'Which is the largest living species of bird?', choices: ['Emu', 'Ostrich', 'Albatross', 'Condor'], correct: 1 },
  { category: 'Nature', text: 'What is a group of lions called?', choices: ['A pack', 'A pride', 'A herd', 'A flock'], correct: 1 },
  { category: 'Nature', text: 'Which tree do acorns grow on?', choices: ['Beech', 'Oak', 'Maple', 'Birch'], correct: 1 },
  { category: 'Nature', text: 'Which mammal is the only one capable of true flight?', choices: ['Flying squirrel', 'Bat', 'Colugo', 'Sugar glider'], correct: 1 },
  { category: 'History', text: 'In which year did the Berlin Wall fall?', choices: ['1987', '1989', '1991', '1993'], correct: 1 },
  { category: 'History', text: 'In which year did the Second World War end?', choices: ['1943', '1944', '1945', '1946'], correct: 2 },
  { category: 'History', text: 'Which empire built Machu Picchu?', choices: ['Aztec', 'Maya', 'Inca', 'Olmec'], correct: 2 },
  { category: 'History', text: 'Who was the first president of the United States?', choices: ['Thomas Jefferson', 'John Adams', 'George Washington', 'Benjamin Franklin'], correct: 2 },
  { category: 'History', text: 'Who was the first person in space?', choices: ['Alan Shepard', 'Yuri Gagarin', 'John Glenn', 'Valentina Tereshkova'], correct: 1 },
  { category: 'History', text: 'In which year did the Titanic sink?', choices: ['1910', '1912', '1914', '1916'], correct: 1 },
  { category: 'History', text: 'Which civilisation built the Great Pyramid of Giza?', choices: ['Ancient Greeks', 'Ancient Egyptians', 'Romans', 'Persians'], correct: 1 },
  { category: 'History', text: 'Which war ended with the Treaty of Versailles?', choices: ['The First World War', 'The Second World War', 'The Crimean War', 'The Franco-Prussian War'], correct: 0 },
  { category: 'Arts', text: 'Who painted the Mona Lisa?', choices: ['Michelangelo', 'Leonardo da Vinci', 'Raphael', 'Donatello'], correct: 1 },
  { category: 'Arts', text: 'Who wrote the novel 1984?', choices: ['Aldous Huxley', 'George Orwell', 'Ray Bradbury', 'H. G. Wells'], correct: 1 },
  { category: 'Arts', text: 'How many strings does a standard violin have?', choices: ['Four', 'Five', 'Six', 'Seven'], correct: 0 },
  { category: 'Arts', text: 'How many keys does a standard piano have?', choices: ['76', '82', '88', '96'], correct: 2 },
  { category: 'Arts', text: 'Who wrote Romeo and Juliet?', choices: ['Christopher Marlowe', 'William Shakespeare', 'Ben Jonson', 'John Webster'], correct: 1 },
  { category: 'Arts', text: 'Who composed the symphony that ends with the Ode to Joy?', choices: ['Mozart', 'Beethoven', 'Bach', 'Brahms'], correct: 1 },
  { category: 'Arts', text: 'Which painter cut off part of his own ear?', choices: ['Paul Gauguin', 'Vincent van Gogh', 'Claude Monet', 'Edvard Munch'], correct: 1 },
  { category: 'Arts', text: 'How many lines does a sonnet have?', choices: ['Twelve', 'Fourteen', 'Sixteen', 'Eighteen'], correct: 1 },
  { category: 'Sport', text: 'How many players does a football team have on the pitch?', choices: ['Nine', 'Ten', 'Eleven', 'Twelve'], correct: 2 },
  { category: 'Sport', text: 'How many rings are on the Olympic flag?', choices: ['Four', 'Five', 'Six', 'Seven'], correct: 1 },
  { category: 'Sport', text: 'Which sport is played at Wimbledon?', choices: ['Cricket', 'Tennis', 'Golf', 'Rowing'], correct: 1 },
  { category: 'Sport', text: 'How often are the Summer Olympic Games held?', choices: ['Every two years', 'Every three years', 'Every four years', 'Every five years'], correct: 2 },
  { category: 'Sport', text: 'In which sport would you perform a slam dunk?', choices: ['Volleyball', 'Basketball', 'Handball', 'Netball'], correct: 1 },
  { category: 'Sport', text: 'How many points is a touchdown worth in American football?', choices: ['Three', 'Six', 'Seven', 'Eight'], correct: 1 },
  { category: 'Sport', text: 'Which country has won the most FIFA World Cups?', choices: ['Germany', 'Brazil', 'Italy', 'Argentina'], correct: 1 },
  { category: 'Tech', text: 'What does CPU stand for?', choices: ['Central Processing Unit', 'Computer Power Unit', 'Control Panel Unit', 'Central Program Utility'], correct: 0 },
  { category: 'Tech', text: 'Which language is used to style web pages?', choices: ['HTML', 'CSS', 'SQL', 'JSON'], correct: 1 },
  { category: 'Tech', text: 'What does the HTTP in a web address stand for?', choices: ['Hypertext Transfer Protocol', 'High Transfer Text Protocol', 'Hyperlink Text Transfer Process', 'Host Transfer Protocol'], correct: 0 },
  { category: 'Tech', text: 'What does RAM stand for?', choices: ['Random Access Memory', 'Rapid Access Module', 'Read Access Memory', 'Runtime Allocated Memory'], correct: 0 },
  { category: 'Tech', text: 'Who is credited with inventing the World Wide Web?', choices: ['Bill Gates', 'Tim Berners-Lee', 'Vint Cerf', 'Alan Turing'], correct: 1 },
  { category: 'Tech', text: 'How many bits are in a byte?', choices: ['Four', 'Eight', 'Sixteen', 'Thirty-two'], correct: 1 },
  { category: 'Tech', text: 'What does GPU stand for?', choices: ['Graphics Processing Unit', 'General Processing Unit', 'Graphical Power Unit', 'Grid Processing Unit'], correct: 0 },
  { category: 'Food', text: 'What is the main ingredient of guacamole?', choices: ['Avocado', 'Courgette', 'Pea', 'Cucumber'], correct: 0 },
  { category: 'Food', text: 'Which spice is the most expensive by weight?', choices: ['Vanilla', 'Cardamom', 'Saffron', 'Cinnamon'], correct: 2 },
  { category: 'Food', text: 'Which country does paella come from?', choices: ['Italy', 'Spain', 'Portugal', 'Mexico'], correct: 1 },
  { category: 'Food', text: 'What is tofu made from?', choices: ['Soybeans', 'Rice', 'Wheat', 'Chickpeas'], correct: 0 },
  { category: 'Food', text: 'Which pastry are profiteroles made from?', choices: ['Puff pastry', 'Choux pastry', 'Shortcrust pastry', 'Filo pastry'], correct: 1 },
  { category: 'Food', text: 'Which fruit is traditional cider made from?', choices: ['Pear', 'Apple', 'Grape', 'Plum'], correct: 1 },
]

/**
 * Draws [count] questions at random with no repeats, shuffling each one's choices so the right
 * answer isn't always in the same place. [rng] returns a number in [0, 1) - pass a seeded one to
 * get a repeatable round.
 */
export function pickQuestions(count: number, rng: () => number = Math.random, bank: readonly BankQuestion[] = QUESTION_BANK): BankQuestion[] {
  const pool = [...bank]
  const wanted = Math.max(0, Math.min(count, pool.length))
  const picked: BankQuestion[] = []
  for (let i = 0; i < wanted; i++) {
    picked.push(shuffleChoices(pool.splice(Math.floor(rng() * pool.length), 1)[0], rng))
  }
  return picked
}

function shuffleChoices(question: BankQuestion, rng: () => number): BankQuestion {
  const answer = question.choices[question.correct]
  const choices = [...question.choices]
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[choices[i], choices[j]] = [choices[j], choices[i]]
  }
  return { ...question, choices, correct: choices.indexOf(answer) }
}
