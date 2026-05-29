import type { Question } from '../types';

export const mockQuestions: Question[] = [
  // --- FRONTEND QUESTIONS ---
  {
    id: 'fe-jr-1',
    role: 'Frontend',
    difficulty: 'Junior',
    type: 'technical',
    question: 'Can you explain the difference between client-side rendering (CSR) and server-side rendering (SSR), and when you would choose one over the other?',
    expectedAnswer: 'CSR renders pages in the browser using Javascript, leading to faster subsequent loads but slower initial load and poor SEO. SSR renders pages on the server, sending HTML to the client, providing excellent initial load speeds and SEO.'
  },
  {
    id: 'fe-jr-2',
    role: 'Frontend',
    difficulty: 'Junior',
    type: 'coding',
    question: 'Write a JavaScript function called `debounce` that takes a callback function and a delay time in milliseconds, returning a debounced version of that callback.',
    language: 'javascript',
    codeTemplate: `function debounce(func, delay) {
  // Write your implementation here
  
}`,
    expectedAnswer: 'Should return a function that wraps the target callback, clears any existing timeout via clearTimeout, and sets a new setTimeout to execute the callback after the delay.'
  },
  {
    id: 'fe-mid-1',
    role: 'Frontend',
    difficulty: 'Mid',
    type: 'technical',
    question: 'What is the Virtual DOM in React, how does the reconciliation algorithm work under the hood, and what are the performance implications of key props in lists?',
    expectedAnswer: 'Virtual DOM is a lightweight representation of the real DOM in memory. Reconciliation compares the new Virtual DOM tree with the old one (diffing) and updates only changed nodes. Keys help React identify which items have changed, been added, or been removed, optimizing list rendering.'
  },
  {
    id: 'fe-mid-2',
    role: 'Frontend',
    difficulty: 'Mid',
    type: 'coding',
    question: 'Implement a function \`flattenArray\` that takes a nested array (which can contain numbers, strings, or other nested arrays) and returns a completely flattened 1D array. Avoid using the built-in \`Array.prototype.flat()\` method.',
    language: 'javascript',
    codeTemplate: `function flattenArray(arr) {
  // Write your custom array flattening logic here
  
}`,
    expectedAnswer: 'Requires recursion or an iterative queue/stack approach to traverse nested arrays and concatenate base elements into a single result array.'
  },
  {
    id: 'fe-sr-1',
    role: 'Frontend',
    difficulty: 'Senior',
    type: 'technical',
    question: 'How would you architect a micro-frontend structure for a very large e-commerce dashboard? Specifically, address state sharing, dependency management, CSS isolation, and routing.',
    expectedAnswer: 'Micro-frontends can be styled using module federation, Web Components, or iframe sandboxing. CSS isolation can be achieved via CSS Modules, Shadow DOM, or styled-components. State sharing can be done through a shared event bus, custom events, or lightweight state managers. Dependency management involves declaring shared modules in webpack/vite federation config.'
  },
  {
    id: 'fe-sr-2',
    role: 'Frontend',
    difficulty: 'Senior',
    type: 'coding',
    question: 'Implement a custom JavaScript Promise-like class called \`MyPromise\` that supports basic \`.then()\` chaining and resolving/rejecting. You do not need to implement full Promises/A+ spec, but it should handle async resolutions.',
    language: 'javascript',
    codeTemplate: `class MyPromise {
  constructor(executor) {
    // Implement standard resolution/rejection handlers
  }
  
  then(onFulfilled, onRejected) {
    // Implement chainable callbacks
  }
}`,
    expectedAnswer: 'Requires handling state transitions (pending, fulfilled, rejected), executing the executor, storing callbacks, and executing then-callbacks asynchronously when the promise resolves.'
  },

  // --- BACKEND QUESTIONS ---
  {
    id: 'be-jr-1',
    role: 'Backend',
    difficulty: 'Junior',
    type: 'technical',
    question: 'What is REST? Can you list the primary HTTP verbs, their typical use cases, and explain what makes an operation "idempotent"?',
    expectedAnswer: 'REST is an architectural style for APIs. GET retrieves, POST creates, PUT/PATCH updates, DELETE removes. Idempotency means multiple identical requests yield the same result and side-effects (e.g. GET, PUT, DELETE are idempotent; POST is not).'
  },
  {
    id: 'be-jr-2',
    role: 'Backend',
    difficulty: 'Junior',
    type: 'coding',
    question: 'Create a Node.js-style middleware function in JavaScript that checks if a request has an "Authorization" header. If present, it calls the \`next()\` function. If not, it returns a 401 Unauthorized status.',
    language: 'javascript',
    codeTemplate: `function authMiddleware(req, res, next) {
  // Implement middleware validation
  
}`,
    expectedAnswer: 'Should inspect req.headers.authorization, call next() if valid, or call res.status(401).json(...) if missing.'
  },
  {
    id: 'be-mid-1',
    role: 'Backend',
    difficulty: 'Mid',
    type: 'technical',
    question: 'Compare SQL and NoSQL databases. How do they handle scaling (vertical vs horizontal), and how do ACID properties differ from BASE properties in distributed databases?',
    expectedAnswer: 'SQL is relational, schema-based, scales vertically, and supports strict ACID transactions. NoSQL is non-relational, schema-flexible, scales horizontally, and supports BASE (Basically Available, Soft state, Eventual consistency) properties which prioritize availability over instant consistency.'
  },
  {
    id: 'be-mid-2',
    role: 'Backend',
    difficulty: 'Mid',
    type: 'coding',
    question: 'Implement a basic rate-limiting algorithm in JavaScript. Write a function \`isAllowed(clientId)\` that allows a maximum of 5 requests per 10-second window per client ID. Return true if allowed, false otherwise.',
    language: 'javascript',
    codeTemplate: `class RateLimiter {
  constructor() {
    this.requests = new Map(); // clientId -> array of timestamps
  }

  isAllowed(clientId) {
    // Implement token bucket or sliding window log
    
  }
}`,
    expectedAnswer: 'Should prune timestamps older than 10 seconds, count remaining entries, and append current time if count < 5, otherwise reject.'
  },
  {
    id: 'be-sr-1',
    role: 'Backend',
    difficulty: 'Senior',
    type: 'technical',
    question: 'How would you design a distributed lock mechanism across a cluster of 50 application nodes running microservices? Compare Redlock (Redis) and ZooKeeper/Consul-based approaches, detailing race conditions and split-brain scenarios.',
    expectedAnswer: 'Redlock uses multiple master Redis instances to acquire locks sequentially with timeouts, requiring a majority consensus. Zookeeper uses ephemeral, sequential znodes with a consensus protocol (ZAB). Split-brain is handled by consensus algorithms (Raft/Paxos) requiring a strict majority (> N/2 nodes) to agree on lock states.'
  },
  {
    id: 'be-sr-2',
    role: 'Backend',
    difficulty: 'Senior',
    type: 'coding',
    question: 'Implement a LRU (Least Recently Used) Cache class in JavaScript. It should support \`get(key)\` and \`put(key, value)\` operations. Both operations must run in O(1) time complexity.',
    language: 'javascript',
    codeTemplate: `class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    // Hint: Map preserves insertion order in JS, or use a Doubly Linked List
  }

  get(key) {
    
  }

  put(key, value) {
    
  }
}`,
    expectedAnswer: 'A Map can be used. When getting/putting a key, delete it and re-add it to move it to the end (most recent). If size exceeds capacity, delete the map.keys().next().value (least recent).'
  },

  // --- SYSTEM DESIGN QUESTIONS ---
  {
    id: 'sd-mid-1',
    role: 'System Design',
    difficulty: 'Mid',
    type: 'technical',
    question: 'Design a system to support real-time chat for a mobile application with 10 million daily active users. Address connection management, message storage (short-term vs long-term), and status indications (online/offline).',
    expectedAnswer: 'Use WebSockets or gRPC for active connections with connection managers. Use Redis for fast online status check and active session tracking. Short-term message store can use Cassandra or DynamoDB for high write throughput. Long-term backup in S3. Push notifications for offline users.'
  },
  {
    id: 'sd-sr-1',
    role: 'System Design',
    difficulty: 'Senior',
    type: 'technical',
    question: 'Design a globally distributed video streaming platform like YouTube or Netflix. Explain how you would handle video ingestion, transcoding, content delivery (CDNs), geo-routing, offline caching, and user playback bandwidth adaptation.',
    expectedAnswer: 'Video ingestion uploads to a central object store. Transcoding uses dynamic parallel workers converting raw files to HLS/DASH chunks at different bitrates. CDNs store video segments at edge locations. Geo-DNS routes users to closest edge. Playback client requests chunks matching network speed.'
  },
  {
    id: 'sd-sr-2',
    role: 'System Design',
    difficulty: 'Senior',
    type: 'coding',
    question: 'Design a URL Shortener database schema and implement a base-62 encoding function that converts a 64-bit auto-incrementing ID (e.g. 125693) into a unique short URL path (e.g., "b9d").',
    language: 'javascript',
    codeTemplate: `const CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function encodeId(num) {
  // Convert decimal number to Base-62 string
  
}

function decodeString(str) {
  // Convert Base-62 string back to decimal number
  
}`,
    expectedAnswer: 'EncodeId repeatedly takes remainder modulo 62, maps it to CHARS, and divides the number by 62. DecodeString does the reverse by summing char_index * 62^power.'
  }
];

export function getQuestionsForConfig(role: string, difficulty: 'Junior' | 'Mid' | 'Senior'): Question[] {
  // Filter by role (if System Design, it has less matching, so we fall back appropriately)
  let filtered = mockQuestions.filter(q => q.role.toLowerCase() === role.toLowerCase() && q.difficulty === difficulty);
  
  // If we don't have enough, grab generic/system design questions of matching difficulty
  if (filtered.length < 3) {
    const backup = mockQuestions.filter(q => q.difficulty === difficulty && !filtered.includes(q));
    filtered = [...filtered, ...backup];
  }
  
  // Return a max of 3 questions to keep the simulation engaging but not exhausting
  return filtered.slice(0, 3);
}
