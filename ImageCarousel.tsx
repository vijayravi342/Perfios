//@ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import Styles from './ImageCarousel.module.css';
import ArrowForwardIosIcon from '@material-ui/icons/ArrowForwardIos';
import ArrowBackIosIcon from '@material-ui/icons/ArrowBackIos';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import StopIcon from '@material-ui/icons/Stop';
import FullscreenIcon from '@material-ui/icons/Fullscreen';
import TabUnselectedIcon from '@material-ui/icons/TabUnselected';
import FullscreenExitIcon from '@material-ui/icons/FullscreenExit';
import { connect, useDispatch, useSelector } from 'react-redux';
import { addSubLabel, updatePageNumOnSlide } from 'actions/MultiDocClassifierActions';
import useImage from 'use-image';
import { Image, Layer, Rect, Stage } from 'react-konva';
import { IAutoOcrResponse, ICleanedBoundingBox, IPagesData, IRectangle, ITasks, IWordsData } from 'interfaces/tableDrawingInterfaces';
import { createUUID } from 'utils/commonUtils';
import { canvasShapeNames, shapeNames, shapeRelatedColors } from 'constants/tableDrawing/constants';
import { getAllWordsInsideAreaByMidPoint } from 'utils/extractKeyVal';
import { FindNode } from './TreeUtility';
import Dialog from '@material-ui/core/Dialog';
import { Button, Divider, FormControl, TextField } from '@material-ui/core';
import { IReducer } from 'interfaces/commonInterfaces';
import { ITreeNodeType } from 'interfaces/multiDocClassifierInterfaces';

interface PageType {
  description: string;
  original: string;
  thumbnail: string;
};

interface ImageCarouselProps {
  pages: PageType[];
};

interface PageDataType {
  ID?: string;
  page: PageType;
};
interface IScaledMousePosition {
  mouseX: number;
  mouseY: number;
}
interface ILayerPosition {
  layerX: number;
  layerY: number;
}

interface IProps {
  addSubLabel: (subLabel: string) => void
}

const SingleExractor = (props: any) => {
  const { onClose, open, image, pageNumOnSlide, drawingTool } = props;
  const initialLayerPosition: ILayerPosition = {
    layerX: 0,
    layerY: 0,
  }
  const defaultScalingValue: number = 0.5;
  const shapeStrokeWidth: number = 6;
  const layerRef = useRef<any>();
  const stageRef = useRef<any>();
  const [isDrawing, setIsDrawing] = useState<Boolean>(false);
  const [altPressed, setAltPressed] = useState<boolean>(false);
  const [wordsList, setWordList] = useState<Array<IWordsData>>([]);
  const autoOcrResponse: Array<IAutoOcrResponse> = useSelector((state: IReducer) => state.multiDocClassifierReducer.autoOcrResponse)
  const [sectionSelectionRectangle, setSectionSelectionRectangle] = useState({} as IRectangle);
  const [sectionSelectorDimensions, setSectionSelectorDimensions] = useState({} as ICleanedBoundingBox)
  const [layerScale, setLayerScale] = useState<number>(defaultScalingValue);
  const [layerPosition, setlayerPosition] = useState<ILayerPosition>(initialLayerPosition);
  const [subLabel, setSubLabel] = useState<string>("");
  const Store = useSelector((state: IReducer) => state.multiDocClassifierReducer);
  const dispatch = useDispatch();

  useEffect(() => {
    let pageNode: ITreeNodeType = FindNode(pageNumOnSlide, Store?.treeView)
    console.log("Task", pageNode);

    let Task: Array<ITasks> = pageNode && FindInTasks(autoOcrResponse[0]?.tasks, pageNode?.taskId);
    console.log("Task", Task);

    let FoundPage: Array<IPagesData> = Task && FindInPages(Task[0]?.pages, pageNode?.Page);
    let wordsList: Array<IWordsData> = FoundPage && FoundPage[0]?.words;
    console.log("wordsList", wordsList);

    setWordList(wordsList);
  }, [pageNumOnSlide])

  const FindInTasks = (tasks: Array<ITasks>, ID: number) => {
    let Found = tasks?.filter((item) => item?.taskId === ID);
    return Found
  }

  const FindInPages = (Pages: Array<IPagesData>, ID: number) => {
    let Found = Pages?.filter((item) => item?.pageNumber === ID);
    return Found
  }

  const handleClose = () => {
    setSubLabel("");
    onClose();
  };

  const handleSubLabel = (event: any) => {
    setSubLabel(event.target.value);
  }

  const handleDialogOK = () => {
    dispatch(addSubLabel(subLabel))
  }

  const getScaledMousePosition = (xPos: number, yPos: number) => {
    return {
      mouseX: xPos / layerScale - layerPosition.layerX / layerScale,
      mouseY: yPos / layerScale - layerPosition.layerY / layerScale,
    };
  };

  const selectMultipleWords = () => {
    let subLabel = "";
    let selectedWords = getAllWordsInsideAreaByMidPoint(sectionSelectorDimensions, 0, wordsList);
    subLabel = selectedWords.map(word => word.dpaText.dpCorrected).join(' ');
    setSubLabel(subLabel);
    // props.addSubLabel(subLabel);
  }

  const handleMouseClick = (e: any) => {
    if (e.evt.button) {
      return;
    }

    let scaledMousePosition: IScaledMousePosition = getScaledMousePosition(
      e.evt.layerX,
      e.evt.layerY
    );
    const mouseX: number = scaledMousePosition.mouseX;
    const mouseY: number = scaledMousePosition.mouseY;
    if (isDrawing) {
      setIsDrawing(!isDrawing);
      console.log("drawingTool", drawingTool);

      if (drawingTool === shapeNames.SINGLE_EXTRACTOR && sectionSelectionRectangle && sectionSelectionRectangle.width) {
        console.log("sectionSelectionRectangle", sectionSelectionRectangle);

        setSectionSelectionRectangle({} as IRectangle);
      }
      if (sectionSelectionRectangle && sectionSelectionRectangle.width) {
        selectMultipleWords();
        setSectionSelectionRectangle({} as IRectangle);
      }
      return;
    }

    if (drawingTool === shapeNames.SINGLE_EXTRACTOR) {
      setSectionSelectionRectangle({
        x: mouseX,
        y: mouseY,
        width: 0,
        height: 0,
        id: 0,
        name: canvasShapeNames.rectangle + createUUID(),
      });
    }

    setIsDrawing(!isDrawing);
  }

  const handleMouseMove = (e: any) => {
    if (isDrawing) {
      let scaledMousePosition: IScaledMousePosition = getScaledMousePosition(
        e.evt.layerX,
        e.evt.layerY
      );

      const mouseX = scaledMousePosition.mouseX;
      const mouseY = scaledMousePosition.mouseY;

      if (drawingTool === shapeNames.SINGLE_EXTRACTOR) {
        if (sectionSelectionRectangle) {
          const currentRectangle = sectionSelectionRectangle;
          const newWidth = mouseX - currentRectangle.x;
          const newHeight = mouseY - currentRectangle.y;

          setSectionSelectionRectangle({
            x: currentRectangle.x,
            y: currentRectangle.y,
            width: newWidth,
            height: newHeight,
            id: currentRectangle.id,
            name: currentRectangle.name,
          })

          setSectionSelectorDimensions({
            x: currentRectangle.x,
            y: currentRectangle.y,
            w: newWidth,
            h: newHeight,
          })
        }
      }
    }
  }

  const handleWheel = (event: any) => {
    console.log("altPressed", altPressed);

    if (altPressed) {
      event.evt.preventDefault();
      const scaleBy = 1.2;
      const stage = stageRef.current;
      const layer = layerRef.current;
      const oldScale = layer.scaleX();
      const mousePointTo = {
        x:
          stage.getPointerPosition().x / oldScale -
          layerPosition.layerX / oldScale,
        y:
          stage.getPointerPosition().y / oldScale -
          layerPosition.layerY / oldScale,
      };
      const newScale =
        event.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      layer.scale({ x: newScale, y: newScale });
      setLayerScale(newScale);
      setlayerPosition({
        layerX:
          -(mousePointTo.x - stage.getPointerPosition().x / newScale) *
          newScale,
        layerY:
          -(mousePointTo.y - stage.getPointerPosition().y / newScale) *
          newScale,
      });
    }
  };

  const getSectionSelectionRectangle = () => {
    return (
      <Rect
        x={sectionSelectionRectangle.x}
        y={sectionSelectionRectangle.y}
        width={sectionSelectionRectangle.width}
        height={sectionSelectionRectangle.height}
        stroke={shapeRelatedColors.multiSelectRectStrokeColor}
        strokeWidth={shapeStrokeWidth}
        fill={shapeRelatedColors.multiSelectRectFillColor}
        id="selectBox"
      />
    );
  }

  document.addEventListener('keydown', (e: any) => {
    if (e.altKey) {
      setAltPressed(true);
    }
  })
  document.addEventListener('keyup', (_e: any) => {
    setAltPressed(false);
  })

  return (
    <Dialog className='Single-Extractor-Dialog' onClose={handleClose} open={open} maxWidth={"lg"}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <Stage
            id='stage-action-events'
            height={image?.height * defaultScalingValue}
            width={image?.width * defaultScalingValue}
            ref={stageRef}
            onWheel={handleWheel}
            onContentClick={handleMouseClick}
            onContentMousemove={handleMouseMove}
          >
            <Layer
              id='layer-scale-position'
              scaleX={layerScale}
              scaleY={layerScale}
              x={layerPosition.layerX}
              y={layerPosition.layerY}
              ref={layerRef}
              draggable={true}
              onDragMove={(e: any) => {
                if (altPressed) {
                  e.evt.preventDefault();
                  e.evt.stopPropagation();
                }
              }}
              onDragEnd={() => {
                setlayerPosition({
                  layerX: layerRef.current.x(),
                  layerY: layerRef.current.y(),
                });
              }}
            >
              <Image
                image={image}
                height={image?.height}
                width={image?.width}
              />
              {getSectionSelectionRectangle()}
            </Layer>
          </Stage>
        </div>
        <Divider />
        <div style={{ display: "flex", justifyContent: "flex-end", position: 'sticky', bottom: 0, backgroundColor: '#f1f1f1', padding: 16 }}>
          <FormControl style={{ marginLeft: "20px" }}>
            <TextField
              id="subLabel-input"
              variant="outlined"
              value={subLabel}
              label="Add Sub-label"
              onChange={handleSubLabel}
              style={{ width: "20vh" }}
              size="small"
            />
          </FormControl>
          <Button color="primary" variant="contained" type="submit" style={{ marginLeft: "10px" }} onClick={() => { handleDialogOK(); handleClose(); }}>OK</Button>
        </div>
      </div>
    </Dialog>
  )
}

const ImageCarousel: React.FC<ImageCarouselProps & IProps> = (props: any) => {

  const [drawingTool, setDrawingTool] = useState<string>("");
  const [open, setOpen] = useState<boolean>(false);
  const { pages } = props
  const [pageList, setPageList] = useState<PageType[]>([]);
  const [pageData, setPageData] = useState<PageDataType>({
    ID: '',
    page: {
      description: '',
      original: '',
      thumbnail: '',
    },
  });
  const Store = useSelector((state: IReducer) => state.multiDocClassifierReducer);
  const [autoplayId, setAutoPlayId] = useState<NodeJS.Timeout | null>(null);
  const [full, setFull] = useState<boolean>(false);
  const dispatch = useDispatch();

  useEffect(() => {
    console.log("pages", pages);

    setPageList(pages);
    if (Store?.pageNumOnSlide && Store?.pageNumOnSlide?.length > 0) {
      for (let i = 0; i < pages.length; i++) {
        let Description = pages[i].description
        if (Description === Store.pageNumOnSlide) {
          setPageData({
            index: i,
            page: pages[i]
          })
        }
      }
    } else {
      setPageData({
        index: 0,
        page: pages[0]
      })
    }
  }, [Store?.pageNumOnSlide])

  const [image] = useImage(pageData.page.original);

  const handleScroll = (item: PageType, index: number) => {
    const ID: string = item?.description;
    if (ID) {
      const element = document.getElementById(ID);
      element.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
    }
    setPageData({
      ...pageData,
      index,
      ID,
      page: item
    })
    console.log("item.description", item);

    dispatch(updatePageNumOnSlide(item.description))
  }

  const scroll = (direction: string) => {
    // const { current } = scrollRef;
    const Length = pageList?.length;

    if (direction === "left") {
      if (pageData.index == 0) {
        setPageData({
          index: Length - 1,
          page: pageList[Length - 1]
        })

        handleScroll(pageList[Length - 1], Length - 1)
      } else {
        setPageData({
          index: parseInt(pageData.index) - 1,
          page: pageList[parseInt(pageData.index) - 1]
        })
        handleScroll(pageList[parseInt(pageData.index) - 1], parseInt(pageData.index) - 1)
      }
    } else {
      if (pageData.index == Length - 1) {
        setPageData({
          index: 0,
          page: pageList[0]
        })
        handleScroll(pageList[0], 0)
      } else {
        setPageData({
          index: parseInt(pageData.index) + 1,
          page: pageList[parseInt(pageData.index) + 1]
        })
        handleScroll(pageList[parseInt(pageData.index) + 1], parseInt(pageData.index) + 1)
      }
    }
  }

  const Length = pageList.length
  let newindex = parseInt(pageData.index) ?? 0

  const handleIncrease = () => {
    newindex = newindex + 1
    setPageData({
      index: newindex,
      page: pageList[newindex]
    })
    handleScroll("e", pageList[newindex], newindex)
  }

  const Autoplay = () => {
    setAutoPlayId(1)
    const ID = setInterval(() => {
      setAutoPlayId(ID)
      if (newindex >= Length) {
        clearInterval(ID)
        setAutoPlayId(null)
      } else {
        handleIncrease()
      }
    }, [3000])
  }

  const StopAutoPlay = () => {
    clearInterval(autoplayId)
    setAutoPlayId(null)
  }

  var changeHandler = function () {
    setFull(false)
  }
  document.addEventListener("fullscreenchange", changeHandler, false);
  document.addEventListener("webkitfullscreenchange", changeHandler, false);
  document.addEventListener("mozfullscreenchange", changeHandler, false);

  const Timer = () => {
    setTimeout(() => {
      setFull(true)
    }, [10])
  }
  const hanldeFullscreen = () => {
    Timer()
    const RequestScreen = document.getElementById("CarouselCOntainerFullscreen");
    RequestScreen.requestFullscreen()
    // else {
    //   RequestScreen.exitFullscreen();
    //   setFull(false)
    // }
  }
  const exitFullscreen = () => {
    setFull(false)
    document.exitFullscreen()
  }

  const handleDrawingTool = () => {
    setDrawingTool("SINGLE_EXTRACTOR");
  }

  const handleClickOpen = () => {
    setOpen(true);
  }
  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <div id="CarouselCOntainerFullscreen" >
        <div className={Styles.Container} >
          {
            full ?
              <div className={Styles.ControllsSection}>
                {
                  full ? <div onClick={exitFullscreen} className={Styles.FullscreenButtonFS}>
                    <FullscreenExitIcon className={Styles.FullscreenIcon} />
                  </div>
                    :
                    <div onClick={hanldeFullscreen} className={Styles.FullscreenButtonFS}>
                      <FullscreenIcon className={Styles.FullscreenIcon} />
                    </div>
                }

                <div onClick={() => scroll('left')} className={Styles.LeftArrowButtonFS}><ArrowBackIosIcon /></div>
                <div onClick={() => scroll('right')} className={Styles.RightArrowButtonFS}><ArrowForwardIosIcon /></div>
                <div className={Styles.PlayButton} onClick={autoplayId ? StopAutoPlay : Autoplay}>
                  {autoplayId ? <div onClick={StopAutoPlay}><StopIcon /></div> : <div onClick={Autoplay}><PlayArrowIcon /></div>}
                </div>
              </div>
              :
              !full &&
              <div className={Styles.ControllsSection}>
                <div onClick={hanldeFullscreen} className={Styles.FullscreenButton}>
                  <FullscreenIcon className={Styles.FullscreenIcon} /></div>
                <div onClick={() => scroll('left')} className={Styles.LeftArrowButton}><ArrowBackIosIcon /></div>
                <div onClick={() => scroll('right')} className={Styles.RightArrowButton}><ArrowForwardIosIcon /></div>
                <div
                  className={Styles.SingleExtractorButton}
                  onClick={() => {
                    handleDrawingTool()
                    handleClickOpen()
                  }}
                >
                  <TabUnselectedIcon />
                </div>
                <div className={Styles.PlayButton}>
                  {
                    !autoplayId ?
                      <div onClick={Autoplay}><PlayArrowIcon /></div>
                      :
                      <div onClick={StopAutoPlay}><StopIcon /></div>
                  }
                </div>
                <div className={Styles.PageDescriptionContainer}>
                  <span className={Styles.PageDescriptionLabel}>{pageData.description ?? ''}</span>
                </div>
              </div>
          }
        </div>
        <SingleExractor open={open} onClose={handleClose} image={image} pageNumOnSlide={Store?.pageNumOnSlide} drawingTool={drawingTool} />
        <div className={Styles.CarouselContainer} >
          <div className={full ? Styles.ThumbnailContainerFS : Styles.ThumbnailContainer} >
            {
              pageList?.map((item, index) =>
                <div className={Styles.ThumbnailWrapper} id={`${item?.description}`}>
                  <img
                    loading='lazy'
                    src={item.original}
                    className={pageData.index === index ? Styles.selectedImage : null}
                    onClick={() => handleScroll(item, index)}
                  />
                </div>
              )
            }
          </div>
          {
            full ? <div className={Styles.BigImageContainerFS}>
              <div className={Styles.ImageContainerFS}>
                <img src={pageData?.page?.original} />
              </div>
            </div> :
              <div className={Styles.BigImageContainer}>
                <div className={Styles.ImageContainer}>
                  <img
                    loading='lazy'
                    src={pageData?.page?.original}
                  />
                </div>
              </div>
          }
        </div>
      </div>
    </>
  )
}

const mapDispatchToProps = (dispatch: any) => ({
  addSubLabel: (subLabel: string) => {
    dispatch(addSubLabel(subLabel));
  },
});

export default connect(
  null,
  mapDispatchToProps
)(ImageCarousel)



