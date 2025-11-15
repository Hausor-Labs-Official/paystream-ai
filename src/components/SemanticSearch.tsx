'use client';

import { useState } from 'react';
import { Search, Loader2, Sparkles, User, Mail, Briefcase, Building2, Wallet, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface SearchResult {
  employee: {
    id: string;
    name: string;
    email: string;
    role?: string;
    department?: string;
    skills?: string[];
    walletAddress?: string;
  };
  score: number;
  relevance: 'high' | 'medium' | 'low';
}

const SEARCH_EXAMPLES = [
  'blockchain developer',
  'React specialist',
  'senior engineer',
  'Web3 expert',
  'UI/UX designer',
  'backend developer',
];

export function SemanticSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (searchQuery?: string) => {
    const searchTerm = searchQuery || query;

    if (!searchTerm.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const response = await fetch(`/api/employees/search?q=${encodeURIComponent(searchTerm)}&limit=20`);
      const data = await response.json();

      if (data.success) {
        setResults(data.results);

        if (data.results.length === 0) {
          toast('No results found. Try a different search term.', {
            icon: '🔍',
          });
        } else {
          toast.success(`Found ${data.results.length} ${data.results.length === 1 ? 'employee' : 'employees'}`);
        }
      } else {
        toast.error('Search failed. Please try again.');
        console.error('Search failed:', data.error);
        setResults([]);
      }
    } catch (error) {
      toast.error('Search error. Please check your connection.');
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    handleSearch(example);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
  };

  const getRelevanceColor = (relevance: string) => {
    switch (relevance) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="w-full">
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for employees by role, skills, or expertise..."
            className="w-full px-12 py-4 text-base border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            disabled={loading}
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-32 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-medium"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                <span>Searching...</span>
              </div>
            ) : (
              'Search'
            )}
          </button>
        </div>
      </form>

      {/* Quick Examples */}
      {!searched && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-medium text-gray-700">Try these examples:</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {SEARCH_EXAMPLES.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                className="px-4 py-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 hover:border-blue-300 rounded-lg text-sm font-medium transition-all"
                disabled={loading}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
            <Sparkles className="absolute top-0 right-0 text-blue-400 animate-pulse" size={20} />
          </div>
          <p className="text-gray-700 font-medium text-lg">Searching with AI...</p>
          <p className="text-gray-500 text-sm mt-1">Understanding your query semantically</p>
        </div>
      )}

      {/* No Results */}
      {!loading && searched && results.length === 0 && (
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-dashed border-gray-300">
          <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-700 text-lg font-medium mb-2">No employees found</p>
          <p className="text-gray-500 text-sm mb-4">
            Try searching with different keywords or more general terms
          </p>
          <button
            onClick={clearSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">
              Found {results.length} {results.length === 1 ? 'result' : 'results'}
            </h3>
            <button
              onClick={clearSearch}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              New Search
            </button>
          </div>

          <div className="grid gap-4">
            {results.map((result, index) => (
              <div
                key={result.employee.id}
                className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {result.employee.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h4 className="text-xl font-bold text-gray-900">
                          {result.employee.name}
                        </h4>
                        <span
                          className={`px-3 py-1 text-xs font-bold rounded-full border ${getRelevanceColor(result.relevance)}`}
                        >
                          {result.relevance.toUpperCase()} MATCH · {(result.score * 100).toFixed(0)}%
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span className="text-sm truncate">{result.employee.email}</span>
                        </div>

                        {result.employee.role && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Briefcase className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="text-sm font-medium">{result.employee.role}</span>
                          </div>
                        )}

                        {result.employee.department && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="text-sm">{result.employee.department}</span>
                          </div>
                        )}

                        {result.employee.walletAddress && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Wallet className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="text-xs font-mono truncate">
                              {result.employee.walletAddress.slice(0, 6)}...{result.employee.walletAddress.slice(-4)}
                            </span>
                          </div>
                        )}
                      </div>

                      {result.employee.skills && result.employee.skills.length > 0 && (
                        <div className="mt-4">
                          <div className="flex flex-wrap gap-2">
                            {result.employee.skills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full border border-blue-200"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  Semantic Search Tip
                </p>
                <p className="text-sm text-blue-800">
                  This AI-powered search understands meaning and context. Try natural language queries like
                  &quot;crypto expert&quot; to find blockchain developers, or &quot;UI specialist&quot; to find frontend engineers.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
