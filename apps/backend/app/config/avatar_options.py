"""アバターキャラクターのマスターデータ。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional


@dataclass(frozen=True)
class AvatarOption:
    """アバターキャラクターのメタ情報。"""

    avatar_id: str
    provider: str
    display_name: str
    character: str
    gender: str
    description: str
    style: Optional[str] = None
    recommended_use: Optional[str] = None
    tags: Optional[List[str]] = None
    thumbnail_url: Optional[str] = None


AVATAR_OPTIONS: List[AvatarOption] = [
    AvatarOption(
        avatar_id="harry-business",
        provider="azure",
        display_name="Harry (business)",
        character="harry",
        gender="男性",
        description="Harry のビジネススタイルアバター。",
        style="business",
    tags=["Azure", "Business"],
        thumbnail_url="https://ai.azure.com/speechassetscache/avatar/harry/harry-business-thumbnail.png",
    ),
    AvatarOption(
        avatar_id="harry-casual",
        provider="azure",
        display_name="Harry (casual)",
        character="harry",
        gender="男性",
        description="Harry のカジュアルスタイルアバター。",
        style="casual",
    tags=["Azure", "Casual"],
        thumbnail_url="https://ai.azure.com/speechassetscache/avatar/harry/harry-casual-thumbnail.png",
    ),
    AvatarOption(
        avatar_id="harry-youthful",
        provider="azure",
        display_name="Harry (youthful)",
        character="harry",
        gender="男性",
        description="Harry のヤングスタイルアバター。",
        style="youthful",
    tags=["Azure", "Youthful"],
        thumbnail_url="https://ai.azure.com/speechassetscache/avatar/harry/harry-youthful-thumbnail.png",
    ),
    AvatarOption(
        avatar_id="jeff-business",
        provider="azure",
        display_name="Jeff (business)",
        character="jeff",
        gender="男性",
        description="Jeff のビジネススタイルアバター。",
        style="business",
    tags=["Azure", "Business"],
        thumbnail_url="https://ai.azure.com/speechassetscache/avatar/jeff/jeff-business-thumbnail-bg.png",
    ),
    AvatarOption(
        avatar_id="jeff-formal",
        provider="azure",
        display_name="Jeff (formal)",
        character="jeff",
        gender="男性",
        description="Jeff のフォーマルスタイルアバター。",
        style="formal",
    tags=["Azure", "Formal"],
        thumbnail_url="https://ai.azure.com/speechassetscache/avatar/jeff/jeff-formal-thumbnail-bg.png",
    ),
    AvatarOption(
        avatar_id="lisa-casual-sitting",
        provider="azure",
        display_name="Lisa (casual-sitting)",
        character="lisa",
        gender="女性",
        description="Lisa のカジュアル座りスタイルアバター。",
        style="casual-sitting",
    tags=["Azure", "Casual", "Sitting"],
        thumbnail_url="https://ai.azure.com/speechassetscache/avatar/lisa/lisa-casual-sitting-thumbnail.png",
    ),
    AvatarOption(
        avatar_id="lori-casual",
        provider="azure",
        display_name="Lori (casual)",
        character="lori",
        gender="女性",
        description="Lori のカジュアルスタイルアバター。",
        style="casual",
    tags=["Azure", "Casual"],
        thumbnail_url="https://ai.azure.com/speechassetscache/avatar/lori/lori-casual-thumbnail.png",
    ),
    AvatarOption(
        avatar_id="lori-graceful",
        provider="azure",
        display_name="Lori (graceful)",
        character="lori",
        gender="女性",
        description="Lori の優雅なスタイルアバター。",
        style="graceful",
    tags=["Azure", "Graceful"],
        thumbnail_url="https://ai.azure.com/speechassetscache/avatar/lori/lori-graceful-thumbnail.png",
    ),
    AvatarOption(
        avatar_id="lori-formal",
        provider="azure",
        display_name="Lori (formal)",
        character="lori",
        gender="女性",
        description="Lori のフォーマルスタイルアバター。",
        style="formal",
    tags=["Azure", "Formal"],
        thumbnail_url="https://ai.azure.com/speechassetscache/avatar/lori/lori-formal-thumbnail.png",
    ),
    AvatarOption(
        avatar_id="max-business",
        provider="azure",
        display_name="Max (business)",
        character="max",
        gender="男性",
        description="Max のビジネススタイルアバター。",
        style="business",
    tags=["Azure", "Business"],
        thumbnail_url="https://ai.azure.com/speechassetscache/avatar/max/max-business-thumbnail.png",
    ),
    AvatarOption(
        avatar_id="max-casual",
        provider="azure",
        display_name="Max (casual)",
        character="max",
        gender="男性",
        description="Max のカジュアルスタイルアバター。",
        style="casual",
    tags=["Azure", "Casual"],
        thumbnail_url="https://ai.azure.com/speechassetscache/avatar/max/max-casual-thumbnail.png",
    ),
    AvatarOption(
        avatar_id="max-formal",
        provider="azure",
        display_name="Max (formal)",
        character="max",
        gender="男性",
        description="Max のフォーマルスタイルアバター。",
        style="formal",
    tags=["Azure", "Formal"],
        thumbnail_url="https://ai.azure.com/speechassetscache/avatar/max/max-formal-thumbnail.png",
    ),
    AvatarOption(
        avatar_id="meg-formal",
        provider="azure",
        display_name="Meg (formal)",
        character="meg",
        gender="女性",
        description="Meg のフォーマルスタイルアバター。",
        style="formal",
    tags=["Azure", "Formal"],
        thumbnail_url="https://ai.azure.com/speechassetscache/avatar/meg/meg-formal-thumbnail.png",
    ),
    AvatarOption(
        avatar_id="meg-casual",
        provider="azure",
        display_name="Meg (casual)",
        character="meg",
        gender="女性",
        description="Meg のカジュアルスタイルアバター。",
        style="casual",
    tags=["Azure", "Casual"],
        thumbnail_url="https://ai.azure.com/speechassetscache/avatar/meg/meg-casual-thumbnail.png",
    ),
    AvatarOption(
        avatar_id="meg-business",
        provider="azure",
        display_name="Meg (business)",
        character="meg",
        gender="女性",
        description="Meg のビジネススタイルアバター。",
        style="business",
    tags=["Azure", "Business"],
        thumbnail_url="https://ai.azure.com/speechassetscache/avatar/meg/meg-business-thumbnail.png",
    ),
]


def list_avatars() -> List[AvatarOption]:
    """アバター候補の一覧を返却する。"""

    return AVATAR_OPTIONS
