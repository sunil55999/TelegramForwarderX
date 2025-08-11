"""
Phase 3: Regex Editing Rules API endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
import re
from server.database import db
from server.utils.logger import logger
from server.auth.dependencies import get_current_user

router = APIRouter()

class RegexRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    pattern: str
    replacement: Optional[str] = None
    rule_type: str = "find_replace"  # "find_replace", "remove", "extract", "conditional_replace"
    order_index: int = 0
    case_sensitive: bool = False
    mapping_id: Optional[str] = None
    is_active: bool = True

    @validator("pattern")
    def validate_pattern(cls, v):
        try:
            re.compile(v)
            return v
        except re.error:
            raise ValueError("Invalid regex pattern")

    @validator("rule_type")
    def validate_rule_type(cls, v):
        valid_types = ["find_replace", "remove", "extract", "conditional_replace"]
        if v not in valid_types:
            raise ValueError(f"Rule type must be one of: {valid_types}")
        return v

class RegexRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    pattern: Optional[str] = None
    replacement: Optional[str] = None
    rule_type: Optional[str] = None
    order_index: Optional[int] = None
    case_sensitive: Optional[bool] = None
    is_active: Optional[bool] = None

    @validator("pattern")
    def validate_pattern(cls, v):
        if v is not None:
            try:
                re.compile(v)
                return v
            except re.error:
                raise ValueError("Invalid regex pattern")
        return v

@router.get("/", response_model=List[Dict[str, Any]])
async def get_regex_rules(
    user_id: Optional[str] = None,
    mapping_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get regex editing rules for user or mapping"""
    try:
        if mapping_id:
            query = """
                SELECT * FROM regex_editing_rules 
                WHERE mapping_id = ? AND user_id = ? 
                ORDER BY order_index, created_at
            """
            rules = await db.fetch_all(query, [mapping_id, current_user["id"]])
        elif user_id:
            if user_id != current_user["id"] and current_user["user_type"] != "admin":
                raise HTTPException(status_code=403, detail="Access denied")
            
            query = """
                SELECT * FROM regex_editing_rules 
                WHERE user_id = ? AND mapping_id IS NULL 
                ORDER BY order_index, created_at
            """
            rules = await db.fetch_all(query, [user_id])
        else:
            # Get user's global rules
            query = """
                SELECT * FROM regex_editing_rules 
                WHERE user_id = ? AND mapping_id IS NULL 
                ORDER BY order_index, created_at
            """
            rules = await db.fetch_all(query, [current_user["id"]])
        
        return [dict(rule) for rule in rules]
        
    except Exception as e:
        logger.error(f"Error fetching regex rules: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch regex rules")

@router.post("/", response_model=Dict[str, Any])
async def create_regex_rule(
    rule: RegexRuleCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new regex editing rule"""
    try:
        rule_id = f"regex_rule_{int(datetime.now().timestamp() * 1000000)}"
        
        query = """
            INSERT INTO regex_editing_rules (
                id, user_id, mapping_id, name, description, pattern,
                replacement, rule_type, order_index, case_sensitive,
                is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        now = datetime.now()
        await db.execute(query, [
            rule_id,
            current_user["id"],
            rule.mapping_id,
            rule.name,
            rule.description,
            rule.pattern,
            rule.replacement,
            rule.rule_type,
            rule.order_index,
            rule.case_sensitive,
            rule.is_active,
            now,
            now
        ])
        
        # Fetch the created rule
        created_rule = await db.fetch_one(
            "SELECT * FROM regex_editing_rules WHERE id = ?", 
            [rule_id]
        )
        
        logger.info(f"Created regex rule {rule_id} for user {current_user['id']}")
        return dict(created_rule)
        
    except Exception as e:
        logger.error(f"Error creating regex rule: {e}")
        raise HTTPException(status_code=500, detail="Failed to create regex rule")

@router.put("/{rule_id}", response_model=Dict[str, Any])
async def update_regex_rule(
    rule_id: str,
    rule_update: RegexRuleUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a regex editing rule"""
    try:
        # Check if rule exists and user has permission
        existing_rule = await db.fetch_one(
            "SELECT * FROM regex_editing_rules WHERE id = ? AND user_id = ?",
            [rule_id, current_user["id"]]
        )
        
        if not existing_rule:
            raise HTTPException(status_code=404, detail="Regex rule not found")
        
        # Build update query dynamically
        update_fields = []
        update_values = []
        
        for field, value in rule_update.dict(exclude_unset=True).items():
            if value is not None:
                update_fields.append(f"{field} = ?")
                update_values.append(value)
        
        if not update_fields:
            return dict(existing_rule)
        
        update_fields.append("updated_at = ?")
        update_values.append(datetime.now())
        update_values.append(rule_id)
        
        query = f"UPDATE regex_editing_rules SET {', '.join(update_fields)} WHERE id = ?"
        await db.execute(query, update_values)
        
        # Fetch updated rule
        updated_rule = await db.fetch_one(
            "SELECT * FROM regex_editing_rules WHERE id = ?", 
            [rule_id]
        )
        
        logger.info(f"Updated regex rule {rule_id}")
        return dict(updated_rule)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating regex rule: {e}")
        raise HTTPException(status_code=500, detail="Failed to update regex rule")

@router.delete("/{rule_id}")
async def delete_regex_rule(
    rule_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a regex editing rule"""
    try:
        # Check if rule exists and user has permission
        existing_rule = await db.fetch_one(
            "SELECT * FROM regex_editing_rules WHERE id = ? AND user_id = ?",
            [rule_id, current_user["id"]]
        )
        
        if not existing_rule:
            raise HTTPException(status_code=404, detail="Regex rule not found")
        
        await db.execute("DELETE FROM regex_editing_rules WHERE id = ?", [rule_id])
        
        logger.info(f"Deleted regex rule {rule_id}")
        return {"message": "Regex rule deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting regex rule: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete regex rule")

@router.post("/{rule_id}/test")
async def test_regex_rule(
    rule_id: str,
    test_data: Dict[str, str],  # {"text": "sample text to test"}
    current_user: dict = Depends(get_current_user)
):
    """Test a regex rule against sample text"""
    try:
        # Get the rule
        rule = await db.fetch_one(
            "SELECT * FROM regex_editing_rules WHERE id = ? AND user_id = ?",
            [rule_id, current_user["id"]]
        )
        
        if not rule:
            raise HTTPException(status_code=404, detail="Regex rule not found")
        
        test_text = test_data.get("text", "")
        if not test_text:
            raise HTTPException(status_code=400, detail="Test text is required")
        
        # Apply the regex rule
        try:
            flags = 0 if rule["case_sensitive"] else re.IGNORECASE
            pattern = re.compile(rule["pattern"], flags)
            
            result = {"original": test_text, "matches": []}
            
            if rule["rule_type"] == "find_replace":
                result["transformed"] = pattern.sub(rule["replacement"] or '', test_text)
                result["matches"] = pattern.findall(test_text)
            elif rule["rule_type"] == "remove":
                result["transformed"] = pattern.sub('', test_text)
                result["matches"] = pattern.findall(test_text)
            elif rule["rule_type"] == "extract":
                matches = pattern.findall(test_text)
                result["transformed"] = ' '.join(matches) if matches else test_text
                result["matches"] = matches
            elif rule["rule_type"] == "conditional_replace":
                if pattern.search(test_text):
                    result["transformed"] = pattern.sub(rule["replacement"] or '', test_text)
                    result["matches"] = pattern.findall(test_text)
                else:
                    result["transformed"] = test_text
                    result["matches"] = []
            
            return result
            
        except re.error as e:
            raise HTTPException(status_code=400, detail=f"Regex error: {str(e)}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing regex rule: {e}")
        raise HTTPException(status_code=500, detail="Failed to test regex rule")