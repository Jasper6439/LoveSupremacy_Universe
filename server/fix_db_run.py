import re

def find_db_run_calls(text):
    """Find all db.run(...) calls with proper bracket matching."""
    results = []
    i = 0
    while i < len(text) - 6:
        idx = text.find('db.run(', i)
        if idx == -1:
            break
        start = idx
        # Find matching )
        depth = 1
        j = idx + 7
        while j < len(text) and depth > 0:
            if text[j] == '(':
                depth += 1
            elif text[j] == ')':
                depth -= 1
            elif text[j] in '"\'`':
                quote = text[j]
                j += 1
                while j < len(text):
                    if text[j] == '\\':
                        j += 2
                        continue
                    if text[j] == quote:
                        break
                    j += 1
            j += 1
        end = j
        results.append((start, end, text[start:end]))
        i = end
    return results

def fix_call(call_text):
    """Fix a single db.run(...) call."""
    inner = call_text[7:-1]  # Remove 'db.run(' and trailing ')'

    # Split by first comma that's at the top level of the SQL expression
    # The SQL expression is the first argument (a string literal or template literal)
    i = 0
    sql_end = 0
    in_string = False
    string_char = None
    in_template = False
    paren_depth = 0

    while i < len(inner):
        ch = inner[i]
        if not in_string and not in_template:
            if ch in '"\'':
                in_string = True
                string_char = ch
            elif ch == '`':
                in_template = True
            elif ch == '(':
                paren_depth += 1
            elif ch == ')':
                paren_depth -= 1
            elif ch == ',' and paren_depth == 0:
                sql_end = i
                break
        elif in_string:
            if ch == '\\':
                i += 1
            elif ch == string_char:
                in_string = False
        elif in_template:
            if ch == '\\':
                i += 1
            elif ch == '`':
                in_template = False
            elif ch == '$' and i + 1 < len(inner) and inner[i + 1] == '{':
                # Template expression - skip to matching }
                brace_depth = 1
                i += 2
                while i < len(inner) and brace_depth > 0:
                    if inner[i] == '{':
                        brace_depth += 1
                    elif inner[i] == '}':
                        brace_depth -= 1
                    i += 1
                continue
        i += 1

    if sql_end == 0:
        return call_text

    sql_expr = inner[:sql_end].strip()
    args_expr = inner[sql_end + 1:].strip()

    # Skip if args already starts with [ or is ...params
    if args_expr.startswith('[') or args_expr.startswith('...'):
        return call_text

    return f'db.run({sql_expr}, [{args_expr}])'

with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

calls = find_db_run_calls(content)
print(f"Found {len(calls)} db.run calls")

# Replace from end to start to preserve positions
new_content = content
for start, end, call_text in reversed(calls):
    fixed = fix_call(call_text)
    if fixed != call_text:
        print(f"Fixed: {call_text[:60]}...")
        new_content = new_content[:start] + fixed + new_content[end:]

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done!")
