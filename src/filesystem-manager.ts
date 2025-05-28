import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

export class FileSystemManager {
  async readFile(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error}`);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error}`);
    }
  }

  async listFiles(directory: string, pattern?: string): Promise<string[]> {
    try {
      const globPattern = pattern || '**/*';
      const files = await glob(globPattern, {
        cwd: directory,
        nodir: true,
        absolute: true,
      });
      return files;
    } catch (error) {
      throw new Error(`Failed to list files in ${directory}: ${error}`);
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async isDirectory(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  async createDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      throw new Error(`Failed to delete file ${filePath}: ${error}`);
    }
  }

  async getFileStats(filePath: string): Promise<{
    size: number;
    modified: Date;
    created: Date;
  }> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        modified: stats.mtime,
        created: stats.birthtime,
      };
    } catch (error) {
      throw new Error(`Failed to get file stats for ${filePath}: ${error}`);
    }
  }

  getFileExtension(filePath: string): string {
    return path.extname(filePath).toLowerCase();
  }

  getFileName(filePath: string): string {
    return path.basename(filePath);
  }

  getDirectory(filePath: string): string {
    return path.dirname(filePath);
  }

  joinPath(...paths: string[]): string {
    return path.join(...paths);
  }

  resolvePath(filePath: string): string {
    return path.resolve(filePath);
  }

  relativePath(from: string, to: string): string {
    return path.relative(from, to);
  }

  isAbsolutePath(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }

  normalizeUri(uri: string): string {
    // Convert file:// URI to file path
    if (uri.startsWith('file://')) {
      return decodeURIComponent(uri.substring(7));
    }
    return uri;
  }

  pathToUri(filePath: string): string {
    // Convert file path to file:// URI
    const normalized = filePath.replace(/\\/g, '/');
    return `file://${encodeURI(normalized)}`;
  }
}