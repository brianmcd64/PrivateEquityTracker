import { parse } from 'csv-parse';
import fs from 'fs';
import { 
  TaskPhases,
  TaskCategories,
  InsertTaskTemplateItem
} from '@shared/schema';

export interface CsvTemplateItem {
  title: string;
  description?: string;
  phase: string;
  category: string;
  daysFromStart: number;
  assignedTo?: number;
}

// Parse CSV from a file
export async function parseCsvFromFile(filePath: string): Promise<CsvTemplateItem[]> {
  return new Promise((resolve, reject) => {
    const results: CsvTemplateItem[] = [];
    
    fs.createReadStream(filePath)
      .pipe(
        parse({
          columns: true,
          trim: true,
          skip_empty_lines: true,
          skip_records_with_empty_values: true
        })
      )
      .on('data', (data: any) => {
        // Process each row, handling the optional fields
        const item: CsvTemplateItem = {
          title: data.title,
          description: data.description || '',
          phase: validatePhase(data.phase),
          category: validateCategory(data.category),
          daysFromStart: parseInt(data.daysFromStart, 10) || 0,
          assignedTo: data.assignedTo ? parseInt(data.assignedTo, 10) : undefined
        };
        
        results.push(item);
      })
      .on('error', (error) => reject(error))
      .on('end', () => resolve(results));
  });
}

// Parse CSV from a string
export async function parseCsvFromString(csvString: string): Promise<CsvTemplateItem[]> {
  return new Promise((resolve, reject) => {
    const results: CsvTemplateItem[] = [];
    
    parse(
      csvString,
      {
        columns: true,
        trim: true,
        skip_empty_lines: true,
        skip_records_with_empty_values: true
      },
      (error, data) => {
        if (error) {
          return reject(error);
        }
        
        try {
          for (const row of data) {
            const item: CsvTemplateItem = {
              title: row.title,
              description: row.description || '',
              phase: validatePhase(row.phase),
              category: validateCategory(row.category),
              daysFromStart: parseInt(row.daysFromStart, 10) || 0,
              assignedTo: row.assignedTo ? parseInt(row.assignedTo, 10) : undefined
            };
            
            results.push(item);
          }
          
          resolve(results);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

// Validate and normalize phase
function validatePhase(phase: string): string {
  // Check for exact match first
  const exactPhase = Object.values(TaskPhases).find(p => p === phase);
  if (exactPhase) {
    return exactPhase;
  }
  
  // Try to match case-insensitive
  const lowerPhase = phase.toLowerCase();
  const keys = Object.keys(TaskPhases);
  
  for (const key of keys) {
    if (key.toLowerCase() === lowerPhase) {
      return TaskPhases[key as keyof typeof TaskPhases];
    }
  }
  
  // Try to match with underscores replaced by spaces
  for (const key of keys) {
    if (key.replace(/_/g, ' ').toLowerCase() === lowerPhase) {
      return TaskPhases[key as keyof typeof TaskPhases];
    }
  }
  
  // Default to first phase if no match
  console.warn(`Invalid phase: "${phase}". Using default phase instead.`);
  return TaskPhases.LOI_SIGNING;
}

// Validate and normalize category
function validateCategory(category: string): string {
  // Check for exact match first
  const exactCategory = Object.values(TaskCategories).find(c => c === category);
  if (exactCategory) {
    return exactCategory;
  }
  
  // Try to match case-insensitive
  const lowerCategory = category.toLowerCase();
  const keys = Object.keys(TaskCategories);
  
  for (const key of keys) {
    if (key.toLowerCase() === lowerCategory) {
      return TaskCategories[key as keyof typeof TaskCategories];
    }
  }
  
  // Try to match with underscores replaced by spaces
  for (const key of keys) {
    if (key.replace(/_/g, ' ').toLowerCase() === lowerCategory) {
      return TaskCategories[key as keyof typeof TaskCategories];
    }
  }
  
  // Default to first category if no match
  console.warn(`Invalid category: "${category}". Using default category instead.`);
  return TaskCategories.LEGAL;
}

// Convert CSV template items to template items ready for storage
export function convertToTemplateItems(
  items: CsvTemplateItem[], 
  templateId: number
): InsertTaskTemplateItem[] {
  return items.map(item => ({
    templateId,
    title: item.title,
    description: item.description || '',
    phase: item.phase,
    category: item.category,
    daysFromStart: item.daysFromStart,
    assignedTo: item.assignedTo
  }));
}