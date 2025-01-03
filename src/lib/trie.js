class TrieNode {
    constructor() {
        this.children = {};
        this.isEndOfWord = false;
        this.suggestions = [];
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
    }

    insert(word, suggestion) {
        let node = this.root;
        for (const char of word) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
        }
        node.isEndOfWord = true;
        node.suggestions.push(suggestion);
    }

    search(prefix) {
        let node = this.root;
        for (const char of prefix) {
            if (!node.children[char]) {
                return [];
            }
            node = node.children[char];
        }
        return node.suggestions;
    }
}

export default Trie;